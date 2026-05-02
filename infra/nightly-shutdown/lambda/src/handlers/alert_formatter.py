"""Reformats CloudWatch alarm SNS messages into readable emails.

The default CloudWatch -> SNS -> email path produces a generic
"ALARM: <name> in <region>" subject and a JSON-blob body. This Lambda
sits between the alarms and the email-subscribed topic, parses the
alarm JSON, and re-publishes with a project-prefixed subject and a
plain key:value body (no tables — they don't survive copy/paste).
"""

import json
import os

import boto3


PROJECT_NAME = os.environ.get("PROJECT_NAME", "ai-job-portal")

# Lazy-init: tests can monkeypatch _sns to a fake without needing
# AWS_REGION set in the environment.
_sns = None


def _get_sns():
    global _sns
    if _sns is None:
        _sns = boto3.client("sns")
    return _sns


def handler(event, context):
    email_topic_arn = os.environ["EMAIL_TOPIC_ARN"]
    sns = _get_sns()
    forwarded = 0
    for record in event.get("Records", []):
        sns_record = record.get("Sns", {})
        raw_message = sns_record.get("Message", "")
        try:
            alarm = json.loads(raw_message)
        except (TypeError, json.JSONDecodeError):
            # Not a CloudWatch alarm payload — forward as-is so we never
            # silently drop a message we don't understand.
            sns.publish(
                TopicArn=email_topic_arn,
                Subject=_truncate(sns_record.get("Subject", "Alert"), 100),
                Message=raw_message,
            )
            forwarded += 1
            continue

        subject, body = format_alarm(alarm)
        sns.publish(
            TopicArn=email_topic_arn,
            Subject=_truncate(subject, 100),
            Message=body,
        )
        forwarded += 1

    return {"forwarded": forwarded}


def format_alarm(alarm: dict) -> tuple[str, str]:
    state = alarm.get("NewStateValue", "UNKNOWN")
    name = alarm.get("AlarmName", "<unknown alarm>")
    region = alarm.get("Region", "<unknown region>")
    description = alarm.get("AlarmDescription") or "(no description)"
    reason = alarm.get("NewStateReason") or "(no reason)"
    timestamp = alarm.get("StateChangeTime") or "(unknown time)"
    env = _env_from_name(name)

    state_label = {
        "ALARM": "ALARM",
        "OK": "RESOLVED",
        "INSUFFICIENT_DATA": "NO DATA",
    }.get(state, state)

    subject = f"[{PROJECT_NAME} - {env.upper()}] {state_label}: {name}"

    # Plain key:value body — no Markdown tables, no fancy formatting.
    # User feedback: tables get mangled by gmail copy/paste.
    body_lines = [
        f"Project:     {PROJECT_NAME}",
        f"Environment: {env}",
        f"Alarm:       {name}",
        f"State:       {state_label} ({state})",
        f"Region:      {region}",
        f"When:        {timestamp}",
        "",
        "Description",
        "-----------",
        description,
        "",
        "Reason",
        "------",
        reason,
    ]

    log_group = _log_group_for_alarm(name)
    if log_group:
        body_lines += [
            "",
            "Investigate",
            "-----------",
            f"aws logs tail {log_group} --since 1h --profile jobportal --region {region}",
        ]

    return subject, "\n".join(body_lines)


def _env_from_name(name: str) -> str:
    # nightly-shutdown-dev-errors -> "dev"
    # nightly-startup-staging-errors -> "staging"
    parts = name.split("-")
    for env in ("dev", "staging", "prod"):
        if env in parts:
            return env
    return "unknown"


def _log_group_for_alarm(name: str) -> str | None:
    # Map an alarm name back to the Lambda whose errors triggered it.
    # nightly-shutdown-dev-errors -> /aws/lambda/nightly-shutdown-dev
    if name.endswith("-errors"):
        return f"/aws/lambda/{name[:-len('-errors')]}"
    return None


def _truncate(s: str, limit: int) -> str:
    # SNS Subject max is 100 chars per AWS docs.
    return s if len(s) <= limit else s[: limit - 1] + "*"
