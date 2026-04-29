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
