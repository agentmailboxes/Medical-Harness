from __future__ import annotations

import asyncio
import html
import re
from uuid import UUID

import httpx

from app.transport import CircuitBreaker
from app.streaming import bounded_json

REFERENCE_TOOLS = {
    "drug_labels": {
        "description": "Find official US DailyMed label links for one explicitly named medicine. Extract only its generic or brand name as query. This retrieves titles and links, not label contents, approval status, interactions, or dosing advice.",
        "variables": ["query"],
        "name": "DailyMed medicine labels",
        "source": "https://dailymed.nlm.nih.gov/",
        "scope": "US label directory. Match the exact product and formulation with a pharmacist. Label contents and interactions have not been checked.",
    },
    "pubmed_search": {
        "description": "Find PubMed-indexed research abstracts through Europe PMC when the user explicitly asks for studies or research. Extract a short query of medical topic terms only. Never include names, identifiers, personal details, or the conversation. Abstracts are not clinical guidelines.",
        "variables": ["query"],
        "name": "PubMed research lookup",
        "source": "https://europepmc.org/",
        "scope": "PubMed-indexed abstracts, not a systematic review. Study applicability and quality require review.",
    },
}


def clean_text(value, limit):
    if not isinstance(value, str):
        return ""
    return " ".join(html.unescape(re.sub(r"<[^>]*>", " ", value)).split())[:limit]


class ReferenceTools:
    def __init__(self, client=None):
        self.client = client or httpx.AsyncClient(timeout=8, follow_redirects=False,
            limits=httpx.Limits(max_connections=8, max_keepalive_connections=4))
        self.circuits = {key: CircuitBreaker() for key in REFERENCE_TOOLS}

    async def run(self, key, variables):
        info = REFERENCE_TOOLS[key]
        result = {"tool": info["name"], "source": info["source"], "scope": info["scope"], "items": []}
        query = variables.get("query")
        if not isinstance(query, str) or not re.fullmatch(r"[A-Za-z][A-Za-z -]{1,79}", query):
            return {**result, "status": "unavailable", "error": "A short medicine name or medical topic is required."}
        circuit = self.circuits[key]
        try:
            circuit.acquire()
        except Exception:
            return {**result, "status": "unavailable", "error": "Reference provider temporarily unavailable."}
        try:
            async with asyncio.timeout(8):
                if key == "drug_labels":
                    payload = await self._get("https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json",
                        {"drug_name": query.strip(), "pagesize": 3, "page": 1})
                    items = self._labels(payload)
                else:
                    terms = " AND ".join(f'"{term}"' for term in query.lower().split())
                    payload = await self._get("https://www.ebi.ac.uk/europepmc/webservices/rest/search",
                        {"query": f"({terms}) AND SRC:MED AND HAS_ABSTRACT:Y", "format": "json", "resultType": "core", "pageSize": 3})
                    items = self._papers(payload)
            circuit.success()
            return {**result, "status": "available" if items else "empty", "items": items}
        except asyncio.CancelledError:
            circuit.cancel()
            raise
        except Exception:
            circuit.failure()
            return {**result, "status": "unavailable", "error": "Reference lookup could not be completed. No conclusion can be drawn from missing results."}

    async def _get(self, url, params):
        async with self.client.stream("GET", url, params=params) as response:
            response.raise_for_status()
            payload = await bounded_json(response)
        if not isinstance(payload, dict):
            raise ValueError("Invalid reference response")
        return payload

    @staticmethod
    def _labels(payload):
        items = []
        for row in payload.get("data", [])[:3]:
            if not isinstance(row, dict):
                continue
            try:
                identifier = str(UUID(row.get("setid", "")))
            except (ValueError, TypeError, AttributeError):
                continue
            title = clean_text(row.get("title"), 240)
            if title:
                items.append({"title": title, "url": f"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={identifier}",
                              "published": clean_text(row.get("published_date"), 30)})
        return items

    @staticmethod
    def _papers(payload):
        items = []
        for row in payload.get("resultList", {}).get("result", [])[:3]:
            if not isinstance(row, dict):
                continue
            identifier = str(row.get("id", ""))
            title = clean_text(row.get("title"), 240)
            abstract = clean_text(row.get("abstractText"), 1800)
            if row.get("source") != "MED" or not re.fullmatch(r"[0-9]{1,10}", identifier) or not title or not abstract:
                continue
            journal = row.get("journalInfo", {}).get("journal", {})
            items.append({"title": title, "url": f"https://pubmed.ncbi.nlm.nih.gov/{identifier}/",
                          "year": clean_text(row.get("pubYear"), 4), "journal": clean_text(journal.get("title"), 120),
                          "tldr": abstract, "source": "Europe PMC / PubMed", "evidence_kind": "abstract"})
        return items

    async def aclose(self):
        await self.client.aclose()
