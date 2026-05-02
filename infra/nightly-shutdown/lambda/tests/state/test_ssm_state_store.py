"""Behavior tests for the SSM-backed StateStore."""

import boto3
import pytest
from moto import mock_aws

from state.ssm import SsmStateStore


@pytest.fixture
def ssm_client():
    with mock_aws():
        yield boto3.client("ssm", region_name="ap-south-1")


def test_save_then_get_round_trips_desired_count(ssm_client):
    store = SsmStateStore(ssm_client=ssm_client, prefix="/nightly-shutdown")

    store.save_desired_count("dev", "ai-job-portal-dev", "auth-service", 3)

    assert (
        store.get_desired_count("dev", "ai-job-portal-dev", "auth-service") == 3
    )


def test_get_returns_none_for_unknown_service(ssm_client):
    store = SsmStateStore(ssm_client=ssm_client, prefix="/nightly-shutdown")

    result = store.get_desired_count("dev", "ai-job-portal-dev", "missing")

    assert result is None


def test_save_overwrites_previous_value_for_same_service(ssm_client):
    # Behavior: saving twice keeps the most recent value (caller controls
    # idempotency via get-before-save when needed; the store itself is plain).
    store = SsmStateStore(ssm_client=ssm_client, prefix="/nightly-shutdown")

    store.save_desired_count("dev", "ai-job-portal-dev", "auth-service", 1)
    store.save_desired_count("dev", "ai-job-portal-dev", "auth-service", 5)

    assert (
        store.get_desired_count("dev", "ai-job-portal-dev", "auth-service") == 5
    )
