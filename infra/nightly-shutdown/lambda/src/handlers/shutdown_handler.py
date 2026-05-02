"""Lambda entrypoint: nightly shutdown of dev resources.

Runs ECS scale-to-0 → RDS stop → Valkey snapshot+delete in that order via
ScheduleOrchestrator. Identifiers come from env vars so the same code can
be reused for staging by deploying a second Lambda with a different env.
"""

import os

import boto3

from controllers.ecs_controller import EcsController
from controllers.rds_controller import RdsController
from controllers.valkey_controller import ValkeyController
from orchestrator import ScheduleOrchestrator
from state.ssm import SsmStateStore


def handler(event, context):
    env = os.environ["SHUTDOWN_ENV"]
    prefix = os.environ.get("STATE_SSM_PREFIX", "/nightly-shutdown")
    db_id = os.environ["RDS_DB_INSTANCE_ID"]
    rg_id = os.environ["VALKEY_REPLICATION_GROUP_ID"]

    state = SsmStateStore(ssm_client=boto3.client("ssm"), prefix=prefix)
    orchestrator = ScheduleOrchestrator(
        controllers=[
            EcsController(
                ecs_client=boto3.client("ecs"), state_store=state
            ),
            RdsController(
                rds_client=boto3.client("rds"),
                state_store=state,
                db_instance_id=db_id,
            ),
            ValkeyController(
                elasticache_client=boto3.client("elasticache"),
                state_store=state,
                replication_group_id=rg_id,
            ),
        ]
    )
    errors = orchestrator.shutdown(env=env)
    return {
        "status": "ok" if not errors else "partial-failure",
        "env": env,
        "action": "shutdown",
        "errors": [
            {"controller": name, "error": str(exc)} for name, exc in errors
        ],
    }
