#!/usr/bin/env bash

set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
SG_ID="${SG_ID:-sg-0e23dbf1f1be865b8}"
PORT="${PORT:-5432}"
DESCRIPTION="${DESCRIPTION:-dev migrations}"
STATE_FILE="${STATE_FILE:-${XDG_CACHE_HOME:-$HOME/.cache}/ai-job-portal/staging-db-ip-last.txt}"
PREVIOUS_CIDR="${PREVIOUS_CIDR:-}"
PUBLIC_IP="${PUBLIC_IP:-}"

aws_base_args() {
  if [[ -n "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
    AWS_ARGS=(--region "${AWS_REGION}")
    return 0
  fi

  if [[ -n "${AWS_PROFILE}" ]]; then
    AWS_ARGS=(--profile "${AWS_PROFILE}" --region "${AWS_REGION}")
    return 0
  fi

  AWS_ARGS=(--region "${AWS_REGION}")
}

AWS_ARGS=()
aws_base_args

detect_public_ip() {
  local ip

  for url in \
    "https://checkip.amazonaws.com" \
    "https://api.ipify.org"
  do
    if ip="$(curl -fsS "${url}" | tr -d '[:space:]')" && [[ "${ip}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      printf '%s\n' "${ip}"
      return 0
    fi
  done

  echo "could not detect public ip" >&2
  return 1
}

revoke_cidr() {
  local cidr="$1"
  local output rc

  set +e
  output="$(aws ec2 revoke-security-group-ingress \
    "${AWS_ARGS[@]}" \
    --group-id "${SG_ID}" \
    --ip-permissions "[{\"IpProtocol\":\"tcp\",\"FromPort\":${PORT},\"ToPort\":${PORT},\"IpRanges\":[{\"CidrIp\":\"${cidr}\"}]}]" 2>&1)"
  rc=$?
  set -e

  if [[ "${rc}" -ne 0 ]]; then
    case "${output}" in
      *InvalidPermission.NotFound*) return 0 ;;
      *)
        printf '%s\n' "${output}" >&2
        return "${rc}"
        ;;
    esac
  fi
}

authorize_cidr() {
  local cidr="$1"
  local output rc

  set +e
  output="$(aws ec2 authorize-security-group-ingress \
    "${AWS_ARGS[@]}" \
    --group-id "${SG_ID}" \
    --ip-permissions "[{\"IpProtocol\":\"tcp\",\"FromPort\":${PORT},\"ToPort\":${PORT},\"IpRanges\":[{\"CidrIp\":\"${cidr}\",\"Description\":\"${DESCRIPTION}\"}]}]" 2>&1)"
  rc=$?
  set -e

  if [[ "${rc}" -ne 0 ]]; then
    case "${output}" in
      *InvalidPermission.Duplicate*) return 0 ;;
      *)
        printf '%s\n' "${output}" >&2
        return "${rc}"
        ;;
    esac
  fi
}

CURRENT_IP="${PUBLIC_IP:-$(detect_public_ip)}"
CURRENT_CIDR="${CURRENT_IP}/32"
AUTH_MODE="env"

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  AUTH_MODE="${AWS_PROFILE:-default-chain}"
fi

if [[ -z "${PREVIOUS_CIDR}" && -f "${STATE_FILE}" ]]; then
  PREVIOUS_CIDR="$(<"${STATE_FILE}")"
fi

echo "auth:    ${AUTH_MODE}"
echo "region:  ${AWS_REGION}"
echo "sg:      ${SG_ID}"
echo "current: ${CURRENT_CIDR}"

if [[ -n "${PREVIOUS_CIDR}" && "${PREVIOUS_CIDR}" != "${CURRENT_CIDR}" ]]; then
  echo "remove:  ${PREVIOUS_CIDR}"
  revoke_cidr "${PREVIOUS_CIDR}"
fi

authorize_cidr "${CURRENT_CIDR}"

mkdir -p "$(dirname "${STATE_FILE}")"
printf '%s\n' "${CURRENT_CIDR}" >"${STATE_FILE}"

echo "add:     ${CURRENT_CIDR}"
echo "state:   ${STATE_FILE}"
