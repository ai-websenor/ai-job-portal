"""ai-prototype-service — entrypoint.

Tracer-bullet scaffold. The only behavior is a /healthz endpoint that returns
503 until application startup completes, then 200. Real AI logic (resume
parsing, job match, skill extraction) is added in follow-up issues #242, #243,
#246. This file should stay tiny — routers go in app/routers/.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import healthz


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-startup: ready=False so /healthz returns 503 (used by ALB / ECS
    # readiness checks while uvicorn is still binding).
    app.state.ready = False
    # Future: load models, warm caches here. For the tracer slice, nothing.
    app.state.ready = True
    yield


app = FastAPI(
    title="ai-prototype-service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(healthz.router)
