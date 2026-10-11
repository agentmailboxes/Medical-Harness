from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

_RATE_LIMITED_PATHS = ("/api/chat",)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int, window_seconds: int):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _client_key(self, request: Request) -> str:
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST" and request.url.path.startswith(_RATE_LIMITED_PATHS):
            key = self._client_key(request)
            now = time.monotonic()
            if len(self._hits) >= 10000 and key not in self._hits:
                cutoff = now - self.window_seconds
                for stale in [k for k, v in self._hits.items() if not v or v[-1] <= cutoff]:
                    del self._hits[stale]
                if len(self._hits) >= 10000:
                    return JSONResponse({"detail": "The service is busy. Please try again shortly."}, status_code=429, headers={"Retry-After": str(self.window_seconds)})
            hits = self._hits[key]
            cutoff = now - self.window_seconds
            while hits and hits[0] < cutoff:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please wait a moment and try again."
                    },
                    headers={"Retry-After": str(self.window_seconds)},
                )
            hits.append(now)
        return await call_next(request)
