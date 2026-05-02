"""Behavior tests for the alert_formatter Lambda."""

import json
import os

import pytest


@pytest.fixture(autouse=True)
def env_vars(monkeypatch):
    monkeypatch.setenv("PROJECT_NAME", "ai-job-portal")
    monkeypatch.setenv(
        "EMAIL_TOPIC_ARN",
        "arn:aws:sns:ap-south-1:000000000000:test-topic",
    )


@pytest.fixture
def captured_publishes(monkeypatch):
    # Replace boto3.client('sns') so handler.publish lands in a list we can
    # inspect, without hitting moto / real AWS.
    calls: list[dict] = []

    class FakeSns:
        def publish(self, **kwargs):
            calls.append(kwargs)
            return {"MessageId": "fake"}

    import handlers.alert_formatter as mod

    monkeypatch.setattr(mod, "_sns", FakeSns())
    return calls


def _alarm_event(alarm_payload: dict) -> dict:
    return {
        "Records": [
            {
                "Sns": {
                    "Subject": f"ALARM: {alarm_payload.get('AlarmName')}",
                    "Message": json.dumps(alarm_payload),
                }
            }
        ]
    }


def test_alarm_state_produces_project_prefixed_subject(captured_publishes):
    from handlers.alert_formatter import handler

    handler(
        _alarm_event(
            {
                "AlarmName": "nightly-shutdown-dev-errors",
                "AlarmDescription": "Shutdown Lambda failed at least once.",
                "NewStateValue": "ALARM",
                "NewStateReason": "Threshold Crossed",
                "StateChangeTime": "2026-05-02T20:00:01.000+0000",
                "Region": "Asia Pacific (Mumbai)",
            }
        ),
        None,
    )

    assert len(captured_publishes) == 1
    sent = captured_publishes[0]
    assert sent["Subject"] == (
        "[ai-job-portal - DEV] ALARM: nightly-shutdown-dev-errors"
    )
    body = sent["Message"]
    assert "Project:     ai-job-portal" in body
    assert "Environment: dev" in body
    assert "State:       ALARM (ALARM)" in body
    assert "Shutdown Lambda failed at least once." in body
    assert "Threshold Crossed" in body
    # No table characters — user copy/pastes from gmail
    assert "|" not in body


def test_ok_state_says_resolved(captured_publishes):
    from handlers.alert_formatter import handler

    handler(
        _alarm_event(
            {
                "AlarmName": "nightly-startup-dev-errors",
                "NewStateValue": "OK",
                "NewStateReason": "Threshold no longer crossed",
                "StateChangeTime": "2026-05-02T20:05:01.000+0000",
                "Region": "ap-south-1",
            }
        ),
        None,
    )

    sent = captured_publishes[0]
    assert sent["Subject"] == (
        "[ai-job-portal - DEV] RESOLVED: nightly-startup-dev-errors"
    )
    assert "State:       RESOLVED (OK)" in sent["Message"]


def test_staging_alarm_routes_env_correctly(captured_publishes):
    from handlers.alert_formatter import handler

    handler(
        _alarm_event(
            {
                "AlarmName": "nightly-shutdown-staging-errors",
                "NewStateValue": "ALARM",
            }
        ),
        None,
    )

    assert "STAGING" in captured_publishes[0]["Subject"]


def test_log_group_hint_included_for_lambda_error_alarms(captured_publishes):
    from handlers.alert_formatter import handler

    handler(
        _alarm_event(
            {
                "AlarmName": "nightly-shutdown-dev-errors",
                "NewStateValue": "ALARM",
                "Region": "ap-south-1",
            }
        ),
        None,
    )

    body = captured_publishes[0]["Message"]
    assert "/aws/lambda/nightly-shutdown-dev" in body
    assert "aws logs tail" in body


def test_non_json_message_passes_through_unchanged(captured_publishes):
    from handlers.alert_formatter import handler

    handler(
        {
            "Records": [
                {
                    "Sns": {
                        "Subject": "manual notification",
                        "Message": "hello not-an-alarm",
                    }
                }
            ]
        },
        None,
    )

    sent = captured_publishes[0]
    assert sent["Subject"] == "manual notification"
    assert sent["Message"] == "hello not-an-alarm"


def test_subject_truncated_to_sns_limit(captured_publishes):
    from handlers.alert_formatter import handler

    long_name = "x" * 200
    handler(
        _alarm_event(
            {"AlarmName": long_name, "NewStateValue": "ALARM"}
        ),
        None,
    )

    sent = captured_publishes[0]
    # SNS Subject max is 100 chars
    assert len(sent["Subject"]) <= 100
    assert sent["Subject"].endswith("*")
