"""RdsController — stops/starts a single RDS DB instance per env.

Why a marker rather than just "is it stopped":
A DB instance can be stopped manually by an operator; the nightly job must
not auto-restart it the next morning. We tag instances *we* stopped via a
single SSM key — only that marker triggers startup.
"""

import time


class RdsController:
    """Stop/start one RDS instance with state-aware guards."""

    def __init__(
        self,
        rds_client,
        state_store,
        db_instance_id: str,
        poll_interval_seconds: float = 15.0,
        max_poll_seconds: float = 600.0,
        start_retry_seconds: float = 60.0,
        max_start_attempts: int = 6,
    ) -> None:
        self._rds = rds_client
        self._state = state_store
        self._db_id = db_instance_id
        self._poll_interval = poll_interval_seconds
        self._max_poll = max_poll_seconds
        self._start_retry = start_retry_seconds
        self._max_start_attempts = max_start_attempts

    def _marker_key(self, env: str) -> str:
        return f"/{env}/rds/{self._db_id}/stopped-by-us"

    def _status(self) -> str:
        return self._rds.describe_db_instances(
            DBInstanceIdentifier=self._db_id
        )["DBInstances"][0]["DBInstanceStatus"]

    def shutdown(self, env: str) -> None:
        status = self._status()
        if status != "available":
            # stopping / stopped / starting / modifying — leave it alone.
            return
        self._state.put(self._marker_key(env), "true")
        self._rds.stop_db_instance(DBInstanceIdentifier=self._db_id)

    def startup(self, env: str) -> None:
        if self._state.get(self._marker_key(env)) != "true":
            return
        # If RDS is already starting/available (eg. previous run partially
        # succeeded), skip the start call and just wait + clear the marker.
        status = self._status()
        if status == "available":
            self._state.delete(self._marker_key(env))
            return
        if status != "starting":
            self._start_with_retry()
        self._wait_until_available()
        self._state.delete(self._marker_key(env))

    def _start_with_retry(self) -> None:
        # AWS undocumented behavior: after stop_db_instance completes and
        # describe shows "stopped", start_db_instance can still raise
        # InvalidDBInstanceStateFault for several minutes. Retry with backoff.
        last_exc: Exception | None = None
        for attempt in range(self._max_start_attempts):
            try:
                self._rds.start_db_instance(DBInstanceIdentifier=self._db_id)
                return
            except self._rds.exceptions.InvalidDBInstanceStateFault as exc:
                last_exc = exc
                if attempt + 1 == self._max_start_attempts:
                    break
                time.sleep(self._start_retry)
        raise RuntimeError(
            f"start_db_instance({self._db_id}) failed after "
            f"{self._max_start_attempts} attempts: {last_exc}"
        )

    def _wait_until_available(self) -> None:
        # RDS start typically takes 3-7 minutes. Lambda timeout must be set
        # accordingly (~900s) — see terraform/lambda.tf.
        elapsed = 0.0
        while elapsed <= self._max_poll:
            if self._status() == "available":
                return
            time.sleep(self._poll_interval)
            elapsed += self._poll_interval
        raise TimeoutError(
            f"RDS instance {self._db_id} did not reach 'available' "
            f"within {self._max_poll}s"
        )
