"""Liveness + readiness in one endpoint.

ECS healthcheck and ALB target-group health both hit /healthz. Returning 503
during startup prevents ECS from registering the task in the target group
before lifespan completes — avoids a brief window of 5xx for traffic that
arrives during cold-start.
"""

from fastapi import APIRouter, Request, Response, status

router = APIRouter()


@router.get("/healthz")
async def healthz(request: Request, response: Response):
    if not getattr(request.app.state, "ready", False):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "starting"}
    return {"status": "ok"}
