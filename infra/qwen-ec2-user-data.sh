#!/bin/bash
set -euxo pipefail

exec > >(tee -a /var/log/qwen-user-data.log | logger -t qwen-user-data -s 2>/dev/console) 2>&1

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg amazon-cloudwatch-agent

if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y docker.io
fi

systemctl enable --now docker
usermod -aG docker ubuntu || true

mkdir -p /opt/dlami/nvme/docker /opt/dlami/nvme/huggingface
if [ -d /opt/dlami/nvme ]; then
  systemctl stop docker || true
  cat >/etc/docker/daemon.json <<'JSON'
{
  "data-root": "/opt/dlami/nvme/docker"
}
JSON
  systemctl start docker
fi

if ! command -v nvidia-ctk >/dev/null 2>&1; then
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list
  apt-get update
  apt-get install -y nvidia-container-toolkit
  nvidia-ctk runtime configure --runtime=docker
  systemctl restart docker
fi

mkdir -p /opt/dlami/nvme/huggingface /opt/aws/amazon-cloudwatch-agent/etc

cat >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'JSON'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/qwen-user-data.log",
            "log_group_name": "/ec2/ai-job-portal/qwen-model",
            "log_stream_name": "{instance_id}/user-data"
          }
        ]
      }
    }
  }
}
JSON

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

docker pull vllm/vllm-openai:v0.8.5
docker rm -f qwen-vllm || true
docker run -d \
  --name qwen-vllm \
  --gpus all \
  --restart unless-stopped \
  -p 8000:8000 \
  -e HF_HOME=/opt/dlami/nvme/huggingface \
  -v /opt/dlami/nvme/huggingface:/opt/dlami/nvme/huggingface \
  vllm/vllm-openai:v0.8.5 \
  --model Qwen/Qwen2.5-3B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype half \
  --max-model-len 12000 \
  --gpu-memory-utilization 0.85 \
  --enforce-eager \
  --disable-log-requests

docker ps
curl -fsS http://localhost:8000/v1/models || true
