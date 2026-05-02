"""Behavior tests for ValkeyController.

ElastiCache replication-group operations have spotty moto support — these
tests use a fake client that records calls and exposes the same
`client.exceptions.<Fault>` namespace boto3 does.
"""

import pytest

from controllers.valkey_controller import SnapshotNotFound, ValkeyController
from state.memory import InMemoryStateStore


RG_ID = "ai-job-portal-dev-valkey"


class _Faults:
    class ReplicationGroupNotFoundFault(Exception):
        pass

    class ReplicationGroupAlreadyExistsFault(Exception):
        pass


class FakeElastiCache:
    """Records calls and returns scripted describe responses."""

    exceptions = _Faults

    def __init__(
        self,
        rg_present: bool = True,
        snapshots: list | None = None,
    ) -> None:
        self._rg_present = rg_present
        self._snapshots = snapshots if snapshots is not None else []
        self.delete_calls: list[dict] = []
        self.create_calls: list[dict] = []

    def describe_replication_groups(self, ReplicationGroupId):
        if not self._rg_present:
            raise _Faults.ReplicationGroupNotFoundFault(ReplicationGroupId)
        return {
            "ReplicationGroups": [
                {
                    "ReplicationGroupId": RG_ID,
                    "Status": "available",
                    "CacheNodeType": "cache.t3.micro",
                    "MemberClusters": [f"{RG_ID}-001"],
                    "AutomaticFailover": "disabled",
                    "TransitEncryptionEnabled": False,
                    "AtRestEncryptionEnabled": False,
                }
            ]
        }

    def describe_cache_clusters(self, CacheClusterId, ShowCacheNodeInfo):
        return {
            "CacheClusters": [
                {
                    "CacheClusterId": CacheClusterId,
                    "Engine": "valkey",
                    "EngineVersion": "7.2",
                    "CacheSubnetGroupName": "ai-job-portal-dev-cache",
                    "SecurityGroups": [{"SecurityGroupId": "sg-0123abc"}],
                    "CacheParameterGroup": {
                        "CacheParameterGroupName": "default.valkey7",
                    },
                }
            ]
        }

    def delete_replication_group(self, **kwargs):
        self.delete_calls.append(kwargs)
        self._rg_present = False
        return {}

    def describe_snapshots(self, **kwargs):
        return {"Snapshots": self._snapshots}

    def create_replication_group(self, **kwargs):
        if self._rg_present:
            raise _Faults.ReplicationGroupAlreadyExistsFault(
                kwargs["ReplicationGroupId"]
            )
        self.create_calls.append(kwargs)
        return {}


def test_shutdown_snapshots_and_deletes_replication_group():
    client = FakeElastiCache()
    state = InMemoryStateStore()
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.shutdown(env="dev")

    assert len(client.delete_calls) == 1
    call = client.delete_calls[0]
    assert call["ReplicationGroupId"] == RG_ID
    assert call["FinalSnapshotIdentifier"] == f"{RG_ID}-final-20260502"
    # Config + snapshot name recorded for startup
    assert state.get(f"/dev/valkey/{RG_ID}/last-snapshot") == (
        f"{RG_ID}-final-20260502"
    )
    assert state.get(f"/dev/valkey/{RG_ID}/config") is not None


def test_shutdown_skips_when_replication_group_already_gone():
    client = FakeElastiCache(rg_present=False)
    state = InMemoryStateStore()
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.shutdown(env="dev")

    assert len(client.delete_calls) == 0


def test_startup_recreates_from_most_recent_snapshot():
    client = FakeElastiCache(
        rg_present=False,
        snapshots=[
            {"SnapshotName": f"{RG_ID}-final-20260501"},
            {"SnapshotName": f"{RG_ID}-final-20260502"},
        ],
    )
    state = InMemoryStateStore()
    state.put(
        f"/dev/valkey/{RG_ID}/last-snapshot",
        f"{RG_ID}-final-20260502",
    )
    state.put(
        f"/dev/valkey/{RG_ID}/config",
        '{"CacheNodeType":"cache.t3.micro",'
        '"CacheSubnetGroupName":"ai-job-portal-dev-cache",'
        '"SecurityGroupIds":["sg-0123abc"],'
        '"Engine":"valkey","EngineVersion":"7.2",'
        '"NumCacheClusters":1,"AutomaticFailoverEnabled":false}',
    )
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.startup(env="dev")

    assert len(client.create_calls) == 1
    call = client.create_calls[0]
    assert call["ReplicationGroupId"] == RG_ID
    assert call["SnapshotName"] == f"{RG_ID}-final-20260502"
    assert call["CacheNodeType"] == "cache.t3.micro"


def test_startup_raises_when_no_snapshot_recorded():
    client = FakeElastiCache(rg_present=False, snapshots=[])
    state = InMemoryStateStore()  # empty — nothing recorded
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    with pytest.raises(SnapshotNotFound):
        controller.startup(env="dev")


def test_shutdown_truncates_engine_version_to_major_minor():
    # AWS describe returns "8.0.1" but create_replication_group rejects
    # patch versions: "Specific version selection is not allowed for '8.0.1'".
    # Controller must record only "8.0".
    class V8_1Client(FakeElastiCache):
        def describe_cache_clusters(self, CacheClusterId, ShowCacheNodeInfo):
            base = super().describe_cache_clusters(
                CacheClusterId, ShowCacheNodeInfo
            )
            base["CacheClusters"][0]["EngineVersion"] = "8.0.1"
            return base

    client = V8_1Client()
    state = InMemoryStateStore()
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.shutdown(env="dev")

    import json as _json

    config = _json.loads(state.get(f"/dev/valkey/{RG_ID}/config"))
    assert config["EngineVersion"] == "8.0"


def test_shutdown_records_encryption_flags():
    # Valkey 8.x rejects create_replication_group without explicit
    # TransitEncryptionEnabled. Snapshots don't preserve these — we MUST
    # capture them on shutdown while the RG still exists.
    class EncryptedClient(FakeElastiCache):
        def describe_replication_groups(self, ReplicationGroupId):
            base = super().describe_replication_groups(ReplicationGroupId)
            base["ReplicationGroups"][0]["TransitEncryptionEnabled"] = True
            base["ReplicationGroups"][0]["AtRestEncryptionEnabled"] = True
            return base

    client = EncryptedClient()
    state = InMemoryStateStore()
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.shutdown(env="dev")

    import json as _json

    config = _json.loads(state.get(f"/dev/valkey/{RG_ID}/config"))
    assert config["TransitEncryptionEnabled"] is True
    assert config["AtRestEncryptionEnabled"] is True


def test_startup_defaults_encryption_flags_when_absent_in_state():
    # Old SSM state from before encryption capture — must default to False
    # rather than fail or omit (AWS rejects omitted flag on Valkey 8.x).
    client = FakeElastiCache(
        rg_present=False,
        snapshots=[{"SnapshotName": f"{RG_ID}-final-20260502"}],
    )
    state = InMemoryStateStore()
    state.put(
        f"/dev/valkey/{RG_ID}/last-snapshot",
        f"{RG_ID}-final-20260502",
    )
    state.put(
        f"/dev/valkey/{RG_ID}/config",
        '{"CacheNodeType":"cache.t3.micro",'
        '"CacheSubnetGroupName":"x","SecurityGroupIds":["sg-x"],'
        '"Engine":"valkey","EngineVersion":"8.0",'
        '"NumCacheClusters":1,"AutomaticFailoverEnabled":false}',
    )
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.startup(env="dev")

    call = client.create_calls[0]
    assert call["TransitEncryptionEnabled"] is False
    assert call["AtRestEncryptionEnabled"] is False


def test_startup_normalizes_old_engine_version_in_state():
    # Defensive: if SSM has stale "8.0.1" recorded by an older controller,
    # startup must still pass "8.0" to create_replication_group.
    client = FakeElastiCache(
        rg_present=False,
        snapshots=[{"SnapshotName": f"{RG_ID}-final-20260502"}],
    )
    state = InMemoryStateStore()
    state.put(
        f"/dev/valkey/{RG_ID}/last-snapshot",
        f"{RG_ID}-final-20260502",
    )
    state.put(
        f"/dev/valkey/{RG_ID}/config",
        '{"CacheNodeType":"cache.t3.micro",'
        '"CacheSubnetGroupName":"x","SecurityGroupIds":["sg-x"],'
        '"Engine":"valkey","EngineVersion":"8.0.1",'
        '"NumCacheClusters":1,"AutomaticFailoverEnabled":false}',
    )
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.startup(env="dev")

    assert client.create_calls[0]["EngineVersion"] == "8.0"


def test_startup_skips_when_replication_group_already_exists():
    # If RG is already up (eg. someone manually re-created it), skip.
    client = FakeElastiCache(rg_present=True)
    state = InMemoryStateStore()
    state.put(f"/dev/valkey/{RG_ID}/last-snapshot", "x")
    controller = ValkeyController(
        elasticache_client=client,
        state_store=state,
        replication_group_id=RG_ID,
        date_provider=lambda: "20260502",
    )

    controller.startup(env="dev")

    assert len(client.create_calls) == 0
