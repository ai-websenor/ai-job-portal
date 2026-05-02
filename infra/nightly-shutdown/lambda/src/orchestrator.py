"""ScheduleOrchestrator — invokes registered controllers in order.

Shutdown order: ECS → RDS → Valkey (so live tasks drain before their
dependencies disappear). Startup is the reverse so DB/cache are ready
before tasks try to connect.

Failures are isolated: one controller raising does NOT abort the rest.
We collect errors and return them so the Lambda log captures the full
picture instead of stopping at the first traceback.
"""

import logging


log = logging.getLogger(__name__)


class ScheduleOrchestrator:
    def __init__(self, controllers: list) -> None:
        self._controllers = controllers

    def shutdown(self, env: str) -> list:
        return self._run_each(env, reverse=False, action="shutdown")

    def startup(self, env: str) -> list:
        return self._run_each(env, reverse=True, action="startup")

    def _run_each(self, env: str, reverse: bool, action: str) -> list:
        ordered = (
            list(reversed(self._controllers)) if reverse else self._controllers
        )
        errors: list = []
        for ctrl in ordered:
            try:
                getattr(ctrl, action)(env=env)
            except Exception as exc:  # noqa: BLE001 — collect, don't abort
                log.exception(
                    "controller %s.%s failed", type(ctrl).__name__, action
                )
                errors.append((type(ctrl).__name__, exc))
        return errors
