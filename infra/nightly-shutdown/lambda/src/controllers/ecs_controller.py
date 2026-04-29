"""EcsController — shuts down and restores ECS services for a given env."""


class EcsController:
    """Encapsulates ECS scale-to-0 / restore logic for one cluster per env."""

    def __init__(self, ecs_client, state_store) -> None:
        self._ecs = ecs_client
        self._state = state_store

    def _cluster_for(self, env: str) -> str:
        return f"ai-job-portal-{env}"

    def shutdown(self, env: str) -> None:
        cluster = self._cluster_for(env)
        services = self._list_service_arns(cluster)
        for arn in services:
            described = self._ecs.describe_services(
                cluster=cluster, services=[arn]
            )["services"][0]
            name = described["serviceName"]
            # Only record on the FIRST shutdown — a re-run would otherwise
            # overwrite the original count with the post-shutdown value 0.
            if self._state.get_desired_count(env, cluster, name) is None:
                self._state.save_desired_count(
                    env, cluster, name, described["desiredCount"]
                )
            self._ecs.update_service(
                cluster=cluster, service=arn, desiredCount=0
            )

    def startup(self, env: str) -> None:
        cluster = self._cluster_for(env)
        services = self._list_service_arns(cluster)
        for arn in services:
            described = self._ecs.describe_services(
                cluster=cluster, services=[arn]
            )["services"][0]
            name = described["serviceName"]
            recorded = self._state.get_desired_count(env, cluster, name)
            # No recorded count → safer to skip than guess. Operator can
            # restore manually if a service was added between shutdown/startup
            # or the state store was wiped.
            if recorded is None:
                continue
            self._ecs.update_service(
                cluster=cluster, service=arn, desiredCount=recorded
            )

    def _list_service_arns(self, cluster: str) -> list[str]:
        # ECS list_services caps at 10 results and returns nextToken — without
        # following it, services 11+ are silently skipped (caught in prod by
        # smoke-testing on the 11-service dev cluster).
        arns: list[str] = []
        token: str | None = None
        while True:
            kwargs = {"cluster": cluster}
            if token is not None:
                kwargs["nextToken"] = token
            resp = self._ecs.list_services(**kwargs)
            arns.extend(resp.get("serviceArns", []))
            token = resp.get("nextToken")
            if not token:
                return arns
