"""Lambda entrypoint: restore dev ECS services to their pre-shutdown count."""

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
    controller.startup(env=env)
    return {"status": "ok", "env": env, "action": "startup"}
