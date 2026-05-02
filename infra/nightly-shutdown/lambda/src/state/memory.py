"""In-memory StateStore for tests."""


class InMemoryStateStore:
    """Stores pre-shutdown service state in a dict. Test-only."""

    def __init__(self) -> None:
        self._counts: dict[tuple[str, str, str], int] = {}
        self._kv: dict[str, str] = {}

    def save_desired_count(
        self, env: str, cluster: str, service: str, count: int
    ) -> None:
        self._counts[(env, cluster, service)] = count

    def get_desired_count(
        self, env: str, cluster: str, service: str
    ) -> int | None:
        return self._counts.get((env, cluster, service))

    def put(self, key: str, value: str) -> None:
        self._kv[key] = value

    def get(self, key: str) -> str | None:
        return self._kv.get(key)

    def delete(self, key: str) -> None:
        self._kv.pop(key, None)
