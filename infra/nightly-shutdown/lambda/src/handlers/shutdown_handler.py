"""Lambda entrypoint: scale dev ECS services to 0.

Wired to an EventBridge cron rule (see terraform/). The event payload is
ignored — env is read from the SHUTDOWN_ENV environment variable so the same
code can be reused for staging by deploying a second Lambda with a different
env var.
"""

import os

import boto3

from controllers.ecs_controller import EcsController
from state.ssm import SsmStateStore


def handler(event, context):
    env = os.environ["SHUTDOWN_ENV"]
    prefix = os.environ.get("STATE_SSM_PREFIX", "/nightly-shutdown")

    controller = EcsController(
        ecs_client=boto3.client("ecs"),
        state_store=SsmStateStore(
            ssm_client=boto3.client("ssm"), prefix=prefix
        ),
    )
    controller.shutdown(env=env)
    return {"status": "ok", "env": env, "action": "shutdown"}
