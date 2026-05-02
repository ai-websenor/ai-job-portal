"""Behavior tests for RdsController.

Uses moto for happy paths and a fake client for the polling loop on startup
(moto returns instances as instantly-available, so the multi-tick poll path
is not exercised under moto alone).
"""

import boto3
import pytest
from moto import mock_aws

from controllers.rds_controller import RdsController
from state.memory import InMemoryStateStore


DB_ID = "ai-job-portal-dev"


@pytest.fixture
def rds_client():
    with mock_aws():
        client = boto3.client("rds", region_name="ap-south-1")
        client.create_db_instance(
            DBInstanceIdentifier=DB_ID,
            DBInstanceClass="db.t3.micro",
            Engine="postgres",
            AllocatedStorage=20,
            MasterUsername="admin",
            MasterUserPassword="not-a-real-password-x9",
        )
        yield client


def _status(rds_client, db_id: str) -> str:
    return rds_client.describe_db_instances(
        DBInstanceIdentifier=db_id
    )["DBInstances"][0]["DBInstanceStatus"]


def test_shutdown_stops_available_instance_and_records_marker(rds_client):
    state = InMemoryStateStore()
    controller = RdsController(
        rds_client=rds_client, state_store=state, db_instance_id=DB_ID
    )

    controller.shutdown(env="dev")

    assert _status(rds_client, DB_ID) == "stopped"
    assert state.get(f"/dev/rds/{DB_ID}/stopped-by-us") == "true"


def test_shutdown_skips_when_already_stopped(rds_client):
    rds_client.stop_db_instance(DBInstanceIdentifier=DB_ID)
    state = InMemoryStateStore()
    controller = RdsController(
        rds_client=rds_client, state_store=state, db_instance_id=DB_ID
    )

    controller.shutdown(env="dev")

    # Marker NOT set — we didn't stop it, so we shouldn't restart it
    assert state.get(f"/dev/rds/{DB_ID}/stopped-by-us") is None


def test_startup_starts_instance_when_marker_present(rds_client):
    rds_client.stop_db_instance(DBInstanceIdentifier=DB_ID)
    state = InMemoryStateStore()
    state.put(f"/dev/rds/{DB_ID}/stopped-by-us", "true")
    controller = RdsController(
        rds_client=rds_client, state_store=state, db_instance_id=DB_ID
    )

    controller.startup(env="dev")

    assert _status(rds_client, DB_ID) == "available"
    # Marker cleared after successful startup
    assert state.get(f"/dev/rds/{DB_ID}/stopped-by-us") is None


def test_startup_skips_when_no_marker(rds_client):
    # Instance is "stopped" but we don't have a marker — operator stopped it
    # manually, leave it alone.
    rds_client.stop_db_instance(DBInstanceIdentifier=DB_ID)
    state = InMemoryStateStore()
    controller = RdsController(
        rds_client=rds_client, state_store=state, db_instance_id=DB_ID
    )

    controller.startup(env="dev")

    assert _status(rds_client, DB_ID) == "stopped"


def test_startup_retries_on_invalid_state_then_succeeds():
    # AWS RDS returns InvalidDBInstanceStateFault for several minutes after a
    # stop completes (undocumented cooldown). Verify we retry with backoff.
    class FakeFaults:
        class InvalidDBInstanceStateFault(Exception):
            pass

    start_calls = []
    raise_count = {"n": 2}  # raise twice, then succeed

    class FakeRds:
        exceptions = FakeFaults

        def describe_db_instances(self, DBInstanceIdentifier):
            return {"DBInstances": [{"DBInstanceStatus": "stopped"}]}

        def start_db_instance(self, DBInstanceIdentifier):
            start_calls.append(DBInstanceIdentifier)
            if raise_count["n"] > 0:
                raise_count["n"] -= 1
                raise FakeFaults.InvalidDBInstanceStateFault(
                    "still cooling down"
                )
            return {}

    state = InMemoryStateStore()
    state.put(f"/dev/rds/{DB_ID}/stopped-by-us", "true")
    controller = RdsController(
        rds_client=FakeRds(),
        state_store=state,
        db_instance_id=DB_ID,
        poll_interval_seconds=0,
        start_retry_seconds=0,
    )

    # Have to also stub the wait loop — describe returns "stopped" forever in
    # this fake. Patch by having describe_db_instances flip to "available"
    # after start succeeds.
    rds = controller._rds
    flipped = {"v": False}

    original_describe = rds.describe_db_instances
    original_start = rds.start_db_instance

    def describe(**kw):
        return {
            "DBInstances": [
                {"DBInstanceStatus": "available" if flipped["v"] else "stopped"}
            ]
        }

    def start(**kw):
        result = original_start(**kw)
        flipped["v"] = True
        return result

    rds.describe_db_instances = describe
    rds.start_db_instance = start

    controller.startup(env="dev")

    # 3 attempts: 2 raises + 1 success
    assert len(start_calls) == 3
    # Marker cleared after successful startup
    assert state.get(f"/dev/rds/{DB_ID}/stopped-by-us") is None


def test_startup_skips_start_if_rds_already_starting():
    # Previous lambda run got start to succeed (boto3 raised but AWS accepted)
    # — current run should not call start_db_instance again.
    start_calls = []
    statuses = iter(["starting", "starting", "available"])

    class FakeRds:
        def describe_db_instances(self, DBInstanceIdentifier):
            return {"DBInstances": [{"DBInstanceStatus": next(statuses)}]}

        def start_db_instance(self, DBInstanceIdentifier):
            start_calls.append(DBInstanceIdentifier)
            return {}

    state = InMemoryStateStore()
    state.put(f"/dev/rds/{DB_ID}/stopped-by-us", "true")
    controller = RdsController(
        rds_client=FakeRds(),
        state_store=state,
        db_instance_id=DB_ID,
        poll_interval_seconds=0,
    )

    controller.startup(env="dev")

    assert len(start_calls) == 0
    assert state.get(f"/dev/rds/{DB_ID}/stopped-by-us") is None


def test_startup_polls_until_available():
    # Fake client that reports "starting" twice then "available". Verifies the
    # controller waits before returning instead of fire-and-forget.
    statuses = iter(["starting", "starting", "available"])
    poll_calls = []

    class FakeRds:
        def describe_db_instances(self, DBInstanceIdentifier):
            poll_calls.append(DBInstanceIdentifier)
            return {
                "DBInstances": [
                    {"DBInstanceStatus": next(statuses)}
                ]
            }

        def start_db_instance(self, DBInstanceIdentifier):
            return {}

    state = InMemoryStateStore()
    state.put(f"/dev/rds/{DB_ID}/stopped-by-us", "true")
    controller = RdsController(
        rds_client=FakeRds(),
        state_store=state,
        db_instance_id=DB_ID,
        poll_interval_seconds=0,  # don't actually sleep in tests
    )

    controller.startup(env="dev")

    # 3 polls = 2 "starting" + 1 "available"
    assert len(poll_calls) == 3
