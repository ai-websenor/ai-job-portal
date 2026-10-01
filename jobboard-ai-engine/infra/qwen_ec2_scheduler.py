import os

import boto3


ec2 = boto3.client("ec2", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
INSTANCE_ID = os.environ["QWEN_EC2_INSTANCE_ID"]


def _state() -> str:
    resp = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
    return resp["Reservations"][0]["Instances"][0]["State"]["Name"]


def lambda_handler(event, context):
    action = event.get("action", "status")
    state = _state()

    if action == "stop":
        if state in {"stopped", "stopping"}:
            return {"status": "already_stopped", "state": state}
        if state != "running":
            return {"status": "skipped", "state": state}
        ec2.stop_instances(InstanceIds=[INSTANCE_ID])
        return {"status": "stopping", "previous_state": state}

    if action == "start":
        if state in {"running", "pending"}:
            return {"status": "already_running", "state": state}
        if state != "stopped":
            return {"status": "skipped", "state": state}
        ec2.start_instances(InstanceIds=[INSTANCE_ID])
        return {"status": "starting", "previous_state": state}

    return {"status": "ok", "state": state}
