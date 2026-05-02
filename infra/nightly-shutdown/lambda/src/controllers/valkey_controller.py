"""ValkeyController — snapshot+delete on shutdown, recreate on startup.

ElastiCache replication groups don't support stop/start in place. To cut
nightly cost we delete the replication group with FinalSnapshotIdentifier
(atomic snapshot+delete in one call), then on startup recreate from that
snapshot. Pre-shutdown config (node type, subnet group, security groups)
is recorded to SSM since recreate-from-snapshot still requires it.

Snapshot naming: <rg-id>-final-<YYYYMMDD>. The date suffix lets us see
shutdown history at a glance and avoids name collisions if shutdown runs
twice the same day.
"""

import json
from datetime import datetime, timezone


class SnapshotNotFound(RuntimeError):
    """Raised on startup when no snapshot exists to restore from."""


def _today_yyyymmdd() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d")


class ValkeyController:
    def __init__(
        self,
        elasticache_client,
        state_store,
        replication_group_id: str,
        date_provider=None,
    ) -> None:
        self._ec = elasticache_client
        self._state = state_store
        self._rg_id = replication_group_id
        self._date = date_provider or _today_yyyymmdd

    def _snap_key(self, env: str) -> str:
        return f"/{env}/valkey/{self._rg_id}/last-snapshot"

    def _config_key(self, env: str) -> str:
        return f"/{env}/valkey/{self._rg_id}/config"

    def shutdown(self, env: str) -> None:
        try:
            rg = self._ec.describe_replication_groups(
                ReplicationGroupId=self._rg_id
            )["ReplicationGroups"][0]
        except self._ec.exceptions.ReplicationGroupNotFoundFault:
            return  # already gone — nothing to do

        # Look up cluster-level fields not exposed on the replication group.
        member_id = rg["MemberClusters"][0]
        cluster = self._ec.describe_cache_clusters(
            CacheClusterId=member_id,
            ShowCacheNodeInfo=False,
        )["CacheClusters"][0]

        config = {
            "CacheNodeType": rg["CacheNodeType"],
            "CacheSubnetGroupName": cluster["CacheSubnetGroupName"],
            "SecurityGroupIds": [
                sg["SecurityGroupId"] for sg in cluster["SecurityGroups"]
            ],
            "Engine": cluster["Engine"],
            # AWS describe returns full version (eg. "8.0.1") but
            # create_replication_group only accepts major.minor ("8.0") —
            # patch versions are AWS-managed.
            "EngineVersion": ".".join(
                cluster["EngineVersion"].split(".")[:2]
            ),
            "NumCacheClusters": len(rg["MemberClusters"]),
            "AutomaticFailoverEnabled": rg.get("AutomaticFailover")
            == "enabled",
            # Required on Valkey 8.x create — AWS errors if omitted.
            # Snapshots don't preserve these flags so we MUST capture them now
            # while the RG still exists.
            "TransitEncryptionEnabled": rg.get(
                "TransitEncryptionEnabled", False
            ),
            "AtRestEncryptionEnabled": rg.get(
                "AtRestEncryptionEnabled", False
            ),
        }
        snapshot_name = f"{self._rg_id}-final-{self._date()}"

        self._state.put(self._config_key(env), json.dumps(config))
        self._state.put(self._snap_key(env), snapshot_name)

        self._ec.delete_replication_group(
            ReplicationGroupId=self._rg_id,
            FinalSnapshotIdentifier=snapshot_name,
        )

    def startup(self, env: str) -> None:
        # Already exists → nothing to do.
        try:
            self._ec.describe_replication_groups(
                ReplicationGroupId=self._rg_id
            )
            return
        except self._ec.exceptions.ReplicationGroupNotFoundFault:
            pass

        snapshot_name = self._resolve_snapshot_name(env)
        config_raw = self._state.get(self._config_key(env))
        if config_raw is None:
            raise SnapshotNotFound(
                f"No recorded config for {self._rg_id}; "
                "cannot recreate replication group."
            )
        config = json.loads(config_raw)
        # Belt-and-braces: also normalize on read in case the SSM state was
        # written by an older controller version that stored full version.
        if "EngineVersion" in config:
            config["EngineVersion"] = ".".join(
                config["EngineVersion"].split(".")[:2]
            )
        # Old state may not have encryption flags — default them so AWS
        # doesn't reject the create call. Dev cluster: encryption is off.
        config.setdefault("TransitEncryptionEnabled", False)
        config.setdefault("AtRestEncryptionEnabled", False)

        self._ec.create_replication_group(
            ReplicationGroupId=self._rg_id,
            ReplicationGroupDescription=f"Restored {self._rg_id} from {snapshot_name}",
            SnapshotName=snapshot_name,
            **config,
        )

    def _resolve_snapshot_name(self, env: str) -> str:
        recorded = self._state.get(self._snap_key(env))
        if recorded:
            return recorded
        # Fallback: scan ElastiCache snapshots for the most recent matching this RG.
        snaps = self._ec.describe_snapshots(
            ReplicationGroupId=self._rg_id
        )["Snapshots"]
        if not snaps:
            raise SnapshotNotFound(
                f"No snapshots found for {self._rg_id}; cannot restore."
            )
        # Snapshot names embed YYYYMMDD; lexical sort = chronological.
        return sorted(snaps, key=lambda s: s["SnapshotName"])[-1]["SnapshotName"]
