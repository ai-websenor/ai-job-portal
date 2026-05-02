"""SSM Parameter Store backed StateStore.

Production state backend. Each service's pre-shutdown desired-count is stored
under a path-segmented parameter so that operators can browse / clear state
through the AWS Console without code support.
"""


class SsmStateStore:
    """Persists desired-count to AWS SSM Parameter Store."""

    def __init__(self, ssm_client, prefix: str) -> None:
        self._ssm = ssm_client
        self._prefix = prefix.rstrip("/")

    def _name(self, env: str, cluster: str, service: str) -> str:
        return f"{self._prefix}/{env}/{cluster}/{service}/desired-count"

    def save_desired_count(
        self, env: str, cluster: str, service: str, count: int
    ) -> None:
        self._ssm.put_parameter(
            Name=self._name(env, cluster, service),
            Value=str(count),
            Type="String",
            Overwrite=True,
        )

    def get_desired_count(
        self, env: str, cluster: str, service: str
    ) -> int | None:
        try:
            resp = self._ssm.get_parameter(
                Name=self._name(env, cluster, service)
            )
        except self._ssm.exceptions.ParameterNotFound:
            return None
        return int(resp["Parameter"]["Value"])

    # Generic kv methods used by Rds/Valkey controllers. Keys are caller-scoped
    # (eg. "/<env>/rds/<id>/stopped-by-us") and prefixed with the same root as
    # ECS state so all nightly-shutdown state lives under one path in SSM.
    def put(self, key: str, value: str) -> None:
        self._ssm.put_parameter(
            Name=f"{self._prefix}{self._normalize(key)}",
            Value=value,
            Type="String",
            Overwrite=True,
        )

    def get(self, key: str) -> str | None:
        try:
            resp = self._ssm.get_parameter(
                Name=f"{self._prefix}{self._normalize(key)}"
            )
        except self._ssm.exceptions.ParameterNotFound:
            return None
        return resp["Parameter"]["Value"]

    def delete(self, key: str) -> None:
        try:
            self._ssm.delete_parameter(
                Name=f"{self._prefix}{self._normalize(key)}"
            )
        except self._ssm.exceptions.ParameterNotFound:
            pass

    @staticmethod
    def _normalize(key: str) -> str:
        return key if key.startswith("/") else f"/{key}"
