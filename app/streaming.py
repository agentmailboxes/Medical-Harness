import json


async def bounded_json(response, max_bytes=262144):
    body = bytearray()
    async for chunk in response.aiter_bytes(chunk_size=4096):
        if len(body) + len(chunk) > max_bytes:
            raise ValueError("Provider response exceeded byte budget")
        body.extend(chunk)
    return json.loads(body)


async def bounded_lines(response, max_bytes=262144, max_line_bytes=65536):
    pending, received = b"", 0
    async for chunk in response.aiter_bytes(chunk_size=4096):
        received += len(chunk)
        if received > max_bytes:
            raise ValueError("Provider stream exceeded byte budget")
        lines = (pending + chunk).split(b"\n")
        pending = lines.pop()
        if len(pending) > max_line_bytes:
            raise ValueError("Provider line exceeded byte budget")
        for line in lines:
            if len(line) > max_line_bytes:
                raise ValueError("Provider line exceeded byte budget")
            yield line.rstrip(b"\r").decode("utf-8")
    if pending:
        yield pending.rstrip(b"\r").decode("utf-8")
