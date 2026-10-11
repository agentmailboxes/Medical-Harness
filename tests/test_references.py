import asyncio

import httpx
import pytest

from app.tools.references import ReferenceTools
from tests.test_pipeline import make_pipeline, FakeEvidence


async def lookup(key, payload, query="metformin", status=200):
    requests = []
    async def handler(request):
        requests.append(request)
        return httpx.Response(status, json=payload)
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    tools = ReferenceTools(client)
    try:
        return await tools.run(key, {"query": query}), requests
    finally:
        await tools.aclose()


async def test_labels_use_validated_set_ids_and_do_not_claim_full_label_contents():
    result, requests = await lookup("drug_labels", {"data": [
        {"setid": "fdbfe194-b845-42c5-bb87-a48118bc72e7", "title": "<b>METFORMIN</b>", "published_date": "Oct 01, 2026"},
        {"setid": "https://evil.invalid/", "title": "Fake"}]})
    assert result["status"] == "available"
    assert len(result["items"]) == 1
    assert result["items"][0]["title"] == "METFORMIN"
    assert result["items"][0]["url"].startswith("https://dailymed.nlm.nih.gov/")
    assert "not been checked" in result["scope"]
    assert requests[0].url.params["drug_name"] == "metformin"


async def test_literature_keeps_only_pubmed_records_with_abstracts():
    result, requests = await lookup("pubmed_search", {"resultList": {"result": [
        {"id": "123456", "source": "MED", "title": "A study", "abstractText": "<p>Abstract &amp; limitations</p>", "pubYear": "2025"},
        {"id": "789", "source": "PPR", "title": "Preprint", "abstractText": "Text"},
        {"id": "123", "source": "MED", "title": "No abstract"}]}}, "diabetes exercise")
    assert result["items"][0]["tldr"] == "Abstract & limitations"
    assert result["items"][0]["url"] == "https://pubmed.ncbi.nlm.nih.gov/123456/"
    assert len(result["items"]) == 1
    assert requests[0].url.params["query"] == '("diabetes" AND "exercise") AND SRC:MED AND HAS_ABSTRACT:Y'


@pytest.mark.parametrize("query", ["https://internal", "name@example.com", "x" * 81, 12, "diabetes OR SRC:PPR", "DOB 1990-01-01"])
async def test_invalid_reference_queries_make_no_network_request(query):
    result, requests = await lookup("drug_labels", {}, query)
    assert result["status"] == "unavailable"
    assert not requests


@pytest.mark.parametrize("payload,status", [({}, 503), ({"data": None}, 200), ([], 200), ({"huge": "x" * 270000}, 200)])
async def test_provider_failures_are_explicit(payload, status):
    result, _ = await lookup("drug_labels", payload, status=status)
    assert result["status"] == "unavailable"
    assert result["items"] == []


async def test_empty_results_are_not_a_no_risk_claim():
    result, _ = await lookup("drug_labels", {"data": []})
    assert result["status"] == "empty"
    assert "interactions have not been checked" in result["scope"]


async def test_cancellation_propagates():
    async def handler(request):
        raise asyncio.CancelledError
    service = ReferenceTools(httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    with pytest.raises(asyncio.CancelledError):
        await service.run("drug_labels", {"query": "metformin"})
    assert service.circuits["drug_labels"].failures == 0
    await service.aclose()


async def test_research_can_supply_sources_when_primary_retrieval_fails():
    class References:
        calls = 0
        async def run(self, key, variables):
            self.calls += 1
            return {"tool": "PubMed research lookup", "status": "available", "items": [
                {"title": "Research", "tldr": "An abstract", "url": "https://pubmed.ncbi.nlm.nih.gov/123/"}]}
    pipeline = make_pipeline({"action": "answer"}, tools={"selected_tools": ["pubmed_search"]}, extract={"query": "diabetes exercise"})
    pipeline.evidence = FakeEvidence(articles=[])
    pipeline.references = References()
    result = await pipeline.run(["Find research on exercise and diabetes"], "test")
    assert result["evidence_status"] == "available"
    assert result["articles"][0]["title"] == "Research"
    await pipeline.run(["Find research on exercise and diabetes"], "test")
    assert pipeline.references.calls == 1
    await pipeline.aclose()


async def test_emergency_never_calls_reference_tools():
    class NoReferences:
        async def run(self, *args):
            raise AssertionError("Emergency must skip retrieval")
    pipeline = make_pipeline({"action": "emergency"}, tools={"selected_tools": ["drug_labels"]})
    pipeline.references = NoReferences()
    result = await pipeline.run(["Synthetic emergency"], "test")
    assert result["emergency"] is True
    assert not result["tool_results"]
