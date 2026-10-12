import httpx
import pytest

from app.streaming import bounded_json, bounded_lines


async def test_utf8_split_over_chunks_and_unterminated_final_line():
    body = b"data: " + b"x" * 4088 + "μ\r\ndata: final".encode()
    response = httpx.Response(200, content=body)
    lines = [line async for line in bounded_lines(response)]
    assert lines[0].endswith("μ")
    assert lines[-1] == "data: final"


async def test_oversized_unterminated_line_fails_before_json_parsing():
    with pytest.raises(ValueError, match="line"):
        async for _ in bounded_lines(httpx.Response(200, content=b"x" * 70000)):
            pass


async def test_stream_aggregate_byte_budget():
    with pytest.raises(ValueError, match="stream"):
        async for _ in bounded_lines(httpx.Response(200, content=b"x\n" * 10000), max_bytes=8000):
            pass


async def test_json_byte_budget():
    with pytest.raises(ValueError, match="response"):
        await bounded_json(httpx.Response(200, json={"data": "x" * 10000}), max_bytes=8000)
