from __future__ import annotations

import logging
import asyncio
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.api.routes import router
from app.config import get_settings
from app.evidence import EvidenceRetriever
from app.llm import CerebrasClient
from app.logging_conf import setup_logging
from app.middleware import RequestSizeMiddleware
from app.pipeline import AgentPipeline
from app.rate_limit import RateLimitMiddleware

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        llm = CerebrasClient(
            api_key=settings.cerebras_api_key,
            model=settings.cerebras_model,
            base_url=settings.cerebras_base_url,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            timeout_seconds=settings.llm_timeout_seconds,
            max_retries=settings.llm_max_retries,
            prompt_cache_key=settings.cerebras_prompt_cache_key,
        )
        evidence = EvidenceRetriever(api_key=settings.medisearch_api_key)
        app.state.request_slots = asyncio.Semaphore(settings.max_concurrent_requests)
        app.state.llm = llm
        pipeline = AgentPipeline(llm=llm, evidence=evidence)
        app.state.pipeline = pipeline
        logger.info("startup complete model=%s version=%s", settings.cerebras_model, __version__)
        try:
            yield
        finally:
            await pipeline.aclose()
            await asyncio.gather(llm.aclose(), evidence.aclose())

    app = FastAPI(title="medical-harness", version=__version__, lifespan=lifespan)

    app.add_middleware(RequestSizeMiddleware, max_bytes=settings.max_request_bytes)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def response_security(request: Request, call_next):
        session = request.cookies.get("medical_harness_session", "")
        valid_session = len(session) == 64 and all(c in "0123456789abcdef" for c in session)
        request.state.cache_scope = session if valid_session else secrets.token_hex(32)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        if not valid_session:
            response.set_cookie("medical_harness_session", request.state.cache_scope, httponly=True,
                                secure=request.url.scheme == "https", samesite="strict")
        return response

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled error kind=%s", type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again."},
        )

    app.include_router(router)
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.get("/", response_class=HTMLResponse)
    async def index() -> HTMLResponse:
        return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"))

    return app


app = create_app()


def run() -> None:

    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port)
