#!/usr/bin/env bash
# Manually invoke the shutdown Lambda for a given env.
# Usage: ./manual-shutdown.sh [env]   (default: dev)

set -euo pipefail

ENV="${1:-dev}"
PROFILE="${AWS_PROFILE:-jobportal}"
REGION="${AWS_REGION:-ap-south-1}"
FN="nightly-shutdown-${ENV}"

echo "Invoking ${FN} (profile=${PROFILE}, region=${REGION})..."
aws lambda invoke \
  --function-name "${FN}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/${FN}-response.json

echo "Response:"
cat /tmp/${FN}-response.json
echo
