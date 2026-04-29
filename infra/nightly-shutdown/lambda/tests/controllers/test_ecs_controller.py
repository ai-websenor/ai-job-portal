"""Behavior tests for EcsController.

Each test exercises the public interface only — `shutdown(env)` and
`startup(env)` — with a moto-mocked ECS client and an in-memory state
store. Internal methods are never imported.
"""

import boto3
import pytest
from moto import mock_aws

from controllers.ecs_controller import EcsController
from state.memory import InMemoryStateStore


CLUSTER = "ai-job-portal-dev"


@pytest.fixture
def ecs_client():
    with mock_aws():
        client = boto3.client("ecs", region_name="ap-south-1")
        client.create_cluster(clusterName=CLUSTER)
        yield client


def _create_service(ecs_client, name: str, desired_count: int) -> None:
    """Helper: register a task def + create a service at given desired count."""
    task_def = ecs_client.register_task_definition(
        family=f"{name}-td",
        containerDefinitions=[
            {"name": name, "image": "nginx:latest", "memory": 128}
        ],
    )["taskDefinition"]["taskDefinitionArn"]
    ecs_client.create_service(
        cluster=CLUSTER,
        serviceName=name,
        taskDefinition=task_def,
        desiredCount=desired_count,
    )


def _service_count(ecs_client, name: str) -> int:
    """Helper: read current desired-count of a service."""
    resp = ecs_client.describe_services(cluster=CLUSTER, services=[name])
    return resp["services"][0]["desiredCount"]


def test_shutdown_records_count_and_scales_service_to_zero(ecs_client):
    # GIVEN one service in the dev cluster at desired-count=2
    _create_service(ecs_client, "auth-service", desired_count=2)
    state = InMemoryStateStore()
    controller = EcsController(ecs_client=ecs_client, state_store=state)

    # WHEN shutdown is invoked for env=dev
    controller.shutdown(env="dev")

    # THEN the service is scaled to 0 in ECS
    assert _service_count(ecs_client, "auth-service") == 0
    # AND the original count of 2 is recorded in the state store
    assert state.get_desired_count("dev", CLUSTER, "auth-service") == 2


def test_startup_restores_recorded_desired_count(ecs_client):
    # GIVEN a service that was scaled-to-zero, with desired-count=3 recorded
    _create_service(ecs_client, "auth-service", desired_count=0)
    state = InMemoryStateStore()
    state.save_desired_count("dev", CLUSTER, "auth-service", 3)
    controller = EcsController(ecs_client=ecs_client, state_store=state)

    # WHEN startup is invoked for env=dev
    controller.startup(env="dev")

    # THEN the service is restored to desired-count=3 in ECS
    assert _service_count(ecs_client, "auth-service") == 3


def test_shutdown_handles_multiple_services_in_cluster(ecs_client):
    # GIVEN a cluster with three services at varying desired-counts
    _create_service(ecs_client, "auth-service", desired_count=1)
    _create_service(ecs_client, "user-service", desired_count=2)
    _create_service(ecs_client, "job-service", desired_count=3)
    state = InMemoryStateStore()
    controller = EcsController(ecs_client=ecs_client, state_store=state)

    # WHEN shutdown is invoked
    controller.shutdown(env="dev")

    # THEN every service is at 0
    for name in ("auth-service", "user-service", "job-service"):
        assert _service_count(ecs_client, name) == 0
    # AND each original count is recorded
    assert state.get_desired_count("dev", CLUSTER, "auth-service") == 1
    assert state.get_desired_count("dev", CLUSTER, "user-service") == 2
    assert state.get_desired_count("dev", CLUSTER, "job-service") == 3


def test_shutdown_is_idempotent_and_preserves_original_count(ecs_client):
    # GIVEN a service originally at desired-count=2
    _create_service(ecs_client, "auth-service", desired_count=2)
    state = InMemoryStateStore()
    controller = EcsController(ecs_client=ecs_client, state_store=state)

    # WHEN shutdown is invoked twice in succession
    controller.shutdown(env="dev")
    controller.shutdown(env="dev")

    # THEN the service is still at 0
    assert _service_count(ecs_client, "auth-service") == 0
    # AND the recorded count is the ORIGINAL 2, not 0 from the second call
    assert state.get_desired_count("dev", CLUSTER, "auth-service") == 2


def test_startup_is_idempotent(ecs_client):
    # GIVEN a service shut-down, with desired-count=2 recorded
    _create_service(ecs_client, "auth-service", desired_count=0)
    state = InMemoryStateStore()
    state.save_desired_count("dev", CLUSTER, "auth-service", 2)
    controller = EcsController(ecs_client=ecs_client, state_store=state)

    # WHEN startup is invoked twice
    controller.startup(env="dev")
    controller.startup(env="dev")

    # THEN the service is at the recorded count, not doubled or zeroed
    assert _service_count(ecs_client, "auth-service") == 2


def test_startup_skips_service_with_no_recorded_count(ecs_client):
    # GIVEN a service that exists but has NO entry in the state store
    # (eg. service was added between shutdown and startup, or state wiped)
    _create_service(ecs_client, "new-service", desired_count=1)
    state = InMemoryStateStore()  # empty
    controller = EcsController(ecs_client=ecs_client, state_store=state)

    # WHEN startup is invoked
    controller.startup(env="dev")

    # THEN the service is left at its current desired-count (untouched)
    assert _service_count(ecs_client, "new-service") == 1


def test_shutdown_and_startup_on_empty_cluster_are_noops(ecs_client):
    # GIVEN a cluster with no services
    state = InMemoryStateStore()
    controller = EcsController(ecs_client=ecs_client, state_store=state)

    # WHEN shutdown and startup are invoked
    controller.shutdown(env="dev")
    controller.startup(env="dev")

    # THEN no error is raised (test passes by reaching this line)


def test_shutdown_paginates_through_list_services():
    # Regression: ECS list_services caps at 10 results by default and returns
    # a nextToken. moto doesn't simulate the cap — so we use a fake client
    # that returns paginated responses, to verify the controller follows
    # nextToken until exhausted.
    page1 = {
        "serviceArns": [f"arn:svc-{i:02d}" for i in range(10)],
        "nextToken": "tok",
    }
    page2 = {"serviceArns": [f"arn:svc-{i:02d}" for i in range(10, 15)]}

    list_calls = []

    class FakeEcs:
        def list_services(self, **kwargs):
            list_calls.append(kwargs)
            if kwargs.get("nextToken") == "tok":
                return page2
            return page1

        def describe_services(self, cluster, services):
            arn = services[0]
            return {
                "services": [
                    {"serviceName": arn.split(":")[1], "desiredCount": 1}
                ]
            }

        update_calls: list = []

        def update_service(self, **kwargs):
            FakeEcs.update_calls.append(kwargs)

    state = InMemoryStateStore()
    controller = EcsController(ecs_client=FakeEcs(), state_store=state)

    controller.shutdown(env="dev")

    # All 15 services were processed (not just the first 10)
    assert len(FakeEcs.update_calls) == 15
    # Pagination was followed: 2 list_services calls (initial + nextToken)
    assert len(list_calls) == 2
    assert list_calls[1]["nextToken"] == "tok"
