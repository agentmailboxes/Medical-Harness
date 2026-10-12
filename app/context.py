from __future__ import annotations

import json
import os
import re
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, BaseModel, Field, field_validator


class ClientContext(BaseModel):
    time_zone: str | None = Field(default=None, max_length=80)
    locale: str | None = Field(default=None, max_length=35, pattern=r"^[A-Za-z0-9-]+$")
    country_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")

    @field_validator("time_zone")
    @classmethod
    def valid_time_zone(cls, value):
        if value is not None:
            try:
                ZoneInfo(value)
            except (ZoneInfoNotFoundError, ValueError):
                raise ValueError("Use a valid IANA time zone, such as Asia/Kolkata") from None
        return value


class RequestContext(BaseModel):
    received_at: AwareDatetime
    local_date: str
    time_zone: str
    time_zone_source: str
    locale: str | None = None
    country_code: str | None = None
    country_source: str = "unknown"


request_context: ContextVar[RequestContext | None] = ContextVar("request_context", default=None)
user_turn_times: ContextVar[list[datetime | None]] = ContextVar("user_turn_times", default=[])


def resolve_context(client: ClientContext, headers, now: datetime | None = None) -> RequestContext:
    now = now or datetime.now(timezone.utc)
    zone, source = client.time_zone, "browser"
    country, country_source = client.country_code, "user" if client.country_code else "unknown"
    if os.getenv("VERCEL") == "1":
        if not zone:
            candidate = headers.get("x-vercel-ip-timezone", "")
            try:
                ZoneInfo(candidate)
                zone, source = candidate, "approximate_network"
            except (ZoneInfoNotFoundError, ValueError):
                pass
        if not country:
            candidate = headers.get("x-vercel-ip-country", "")
            if re.fullmatch(r"[A-Z]{2}", candidate):
                country, country_source = candidate, "approximate_network"
    if not zone:
        zone, source = "UTC", "fallback"
    local = now.astimezone(ZoneInfo(zone))
    return RequestContext(received_at=local, local_date=local.date().isoformat(), time_zone=zone,
                          time_zone_source=source, locale=client.locale,
                          country_code=country, country_source=country_source)


def contextualize(conversation: list[str]) -> str:
    context = request_context.get()
    prior = user_turn_times.get()
    lines = []
    if context:
        info = context.model_dump(mode="json")
        info["received_at"] = context.received_at.replace(second=0, microsecond=0).isoformat()
        info["today"] = context.local_date
        info["yesterday"] = (context.received_at.date() - timedelta(days=1)).isoformat()
        lines.append("Request context (not clinical evidence): " + json.dumps(info))
        lines.append("Interpret today/yesterday against the date attached to that patient turn. "
                     "Morning/evening are approximate, not exact onset times. Ask for a time if duration affects care. "
                     "Earlier turn timestamps are client-supplied context, not verified observations. "
                     "Without a prior timestamp, do not assume an earlier turn happened today. "
                     "UTC fallback and network location are uncertain; confirm when relevant. "
                     "A time zone or language does not establish physical location. Never select an emergency number "
                     "or make location-dependent care claims from an approximate country alone.")
    for index, message in enumerate(conversation):
        role = "Patient" if index % 2 == 0 else "Assistant"
        if context and index % 2 == 0:
            timestamp = context.received_at if index == len(conversation) - 1 else (prior[index // 2] if index // 2 < len(prior) else None)
            stamp = timestamp.replace(second=0, microsecond=0).isoformat() if timestamp else "unknown"
            role += f" (message time: {stamp})"
        lines.append(f"{role}: {message}")
    return "\n".join(lines)
