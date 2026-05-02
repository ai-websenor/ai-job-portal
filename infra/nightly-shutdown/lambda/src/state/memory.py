"""In-memory StateStore for tests."""


class InMemoryStateStore:
    """Stores pre-shutdown service state in a dict. Test-only."""

    def __init__(self) -> None:
        self._store: dict[tuple[str, str, str], int] = {}

    def save_desired_count(
        self, env: str, cluster: str, service: str, count: int
    ) -> None:
        self._store[(env, cluster, service)] = count

    def get_desired_count(
        self, env: str, cluster: str, service: str
    ) -> int | None:
        return self._store.get((env, cluster, service))
