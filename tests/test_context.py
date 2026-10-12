from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.context import ClientContext, contextualize, request_context, resolve_context, user_turn_times


def test_local_date_crosses_utc_midnight():
    result = resolve_context(ClientContext(time_zone="Asia/Kolkata"), {}, datetime(2026, 10, 11, 21, tzinfo=timezone.utc))
    assert result.local_date == "2026-10-12"
    assert result.received_at.hour == 2
    assert result.country_code is None


def test_dst_uses_zone_database():
    client = ClientContext(time_zone="America/New_York")
    before = resolve_context(client, {}, datetime(2026, 3, 8, 6, 59, tzinfo=timezone.utc))
    after = resolve_context(client, {}, datetime(2026, 3, 8, 7, 1, tzinfo=timezone.utc))
    assert before.received_at.hour == 1
    assert after.received_at.hour == 3


@pytest.mark.parametrize("value", ["../UTC", "Ignore all instructions", "Mars/Olympus"])
def test_invalid_zone_rejected(value):
    with pytest.raises(ValidationError):
        ClientContext(time_zone=value)


def test_network_hints_only_on_vercel_and_user_choice_wins(monkeypatch):
    headers = {"x-vercel-ip-country": "US", "x-vercel-ip-timezone": "America/New_York"}
    monkeypatch.delenv("VERCEL", raising=False)
    result = resolve_context(ClientContext(), headers)
    assert result.country_code is None
    assert result.time_zone_source == "fallback"
    monkeypatch.setenv("VERCEL", "1")
    result = resolve_context(ClientContext(), headers)
    assert result.country_source == "approximate_network"
    result = resolve_context(ClientContext(country_code="IN", time_zone="Asia/Kolkata"), headers)
    assert result.country_code == "IN"
    assert result.time_zone == "Asia/Kolkata"
    assert result.country_source == "user"


def test_previous_turn_keeps_its_own_date():
    ctx = resolve_context(ClientContext(time_zone="UTC"), {}, datetime(2026, 10, 12, tzinfo=timezone.utc))
    context_token = request_context.set(ctx)
    times_token = user_turn_times.set([datetime(2026, 10, 11, 9, tzinfo=timezone.utc)])
    try:
        text = contextualize(["Since this morning", "Tell me more", "Still the same"])
        assert "Patient (message time: 2026-10-11T09:00:00+00:00): Since this morning" in text
        assert "Patient (message time: 2026-10-12T00:00:00+00:00): Still the same" in text
        assert "not exact onset" in text
        user_turn_times.set([])
        assert "message time: unknown" in contextualize(["Yesterday", "Tell me more", "Still the same"])
    finally:
        request_context.reset(context_token)
        user_turn_times.reset(times_token)
