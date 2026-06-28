# Qwen EC2 Model Server Runbook

## Purpose

Replace SageMaker real-time inference with one private EC2-hosted vLLM server.

Model server:
- Region: `ap-south-1`
- Instance: `g4dn.xlarge`
- Model: `Qwen/Qwen2.5-3B-Instruct`
- API: OpenAI-compatible `POST /v1/chat/completions`
- Private URL: `http://qwen-model.ai-job-portal.internal:8000/v1`

## Relationships

1-1:
- One EC2 instance runs one vLLM model service.
- Example: `ai-job-portal-qwen-model-1` runs `Qwen/Qwen2.5-3B-Instruct`.

1-N:
- One model EC2 serves many ECS `ai-service` tasks.
- Example: dev and staging ECS tasks call the same private model endpoint.

N-N:
- Many users can create many parse/chat/recommend requests through ECS.
- ECS queues/concurrency gates requests before forwarding to the shared model server.

## User Flow

1. Candidate uploads resume to frontend.
2. API gateway routes request to ECS `ai-service`.
3. `ai-service` extracts PDF text.
4. `ai-service` calls private Qwen EC2 vLLM endpoint.
5. vLLM returns parsed JSON text.
6. `ai-service` validates with Pydantic and stores result.
7. Recruiter or candidate opens parsed profile/chat/recommendation.

Example:
- Deepak uploads a 2-page PDF.
- Dev ECS task calls `qwen-model.ai-job-portal.internal`.
- Qwen returns structured resume fields.
- QA checks ECS logs for request status/duration, not resume content.

## AWS Setup

Create model security group:
- Name: `ai-job-portal-qwen-model-sg`
- VPC: `vpc-020ffe005d46c7d22`
- Inbound TCP `8000` from:
  - Dev ECS SG: `sg-01402d187783a6814`
  - Staging ECS SG: `sg-01a201bdfd4194b60`
- No SSH inbound.
- Use SSM Session Manager.

Launch EC2:
- AMI: Ubuntu GPU/DLAMI with NVIDIA driver, or Ubuntu 22.04 plus NVIDIA container toolkit.
- Instance type: `g4dn.xlarge`
- Subnet: `subnet-0b6d0d9346fae035c`
- EBS: `100GB gp3`
- User data: `infra/qwen-ec2-user-data.sh`
- IAM role:
  - `AmazonSSMManagedInstanceCore`
  - CloudWatch logs write permissions

Run vLLM:

```bash
docker run -d --name qwen-vllm --gpus all --restart unless-stopped \
  -p 8000:8000 \
  -e HF_HOME=/opt/dlami/nvme/huggingface \
  -v /opt/dlami/nvme/huggingface:/opt/dlami/nvme/huggingface \
  vllm/vllm-openai:v0.8.5 \
  --model Qwen/Qwen2.5-3B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype half \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.85 \
  --enforce-eager \
  --disable-log-requests
```

Health check:

```bash
curl http://localhost:8000/v1/models
```

Private DNS:
- Create private hosted zone or existing internal DNS record.
- Record: `qwen-model.ai-job-portal.internal`
- Value: EC2 private IP.

## ECS Config

Required env:

```text
LLM_PROVIDER=http
LLM_BASE_URL=http://qwen-model.ai-job-portal.internal:8000/v1
LLM_MODEL=Qwen/Qwen2.5-3B-Instruct
```

Removed env:

```text
SAGEMAKER_ENDPOINT_NAME
```

## ECS Caller Map

Current AWS check: 2026-06-28, `ap-south-1`, profile `jobportal`.

Runtime chain:
- Frontend calls API gateway `/api/v1/ai/*`.
- API gateway strips `/api/v1` and calls ECS `ai-service` `/ai/*`.
- `ai-service` calls EC2 vLLM at `qwen-model.ai-job-portal.internal:8000/v1`.

Current ECS env callers:
- Dev: `user-service` has `AI_MODEL_URL=http://ai-service.ai-job-portal-dev.local:3010/ai`.
- Staging: `user-service`, `auth-service`, and `recommendation-service` have `AI_MODEL_URL` pointing to `ai-service`.
- Staging: `api-gateway` has `AI_SERVICE_URL=http://ai-service.ai-job-portal-staging.local:3010`.

Code-level optional callers:
- `api-gateway` proxies `/api/v1/ai/*` to `AI_SERVICE_URL`.
- `user-service` calls `/parse` and `/parse-status/{job_id}` using `AI_MODEL_URL`.
- `recommendation-service` calls `/recommend` using `AI_MODEL_URL`.
- `messaging-service` calls `/chat` using `JOB_CHAT_AI_SERVICE_URL` or its ALB default.

Deploy note:
- Yes, deploy a new ECS `ai-service` task definition/image before scaling traffic.
- Preserve live task env and secrets from current task definition.
- Patch only image tag plus `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`, and remove `SAGEMAKER_ENDPOINT_NAME`.
- Do not register the checked-in template as-is if it still has placeholder DB values.

## QA Checks

From ECS/VPC:

```bash
curl http://qwen-model.ai-job-portal.internal:8000/v1/models
```

Smoke test:
- Parse 1 short PDF.
- Ask 1 chat question.
- Run 1 recommendation request.
- Confirm no public access to port `8000`.
- Confirm logs show status/duration only, no resume content.

## Rollback

1. Stop ECS deploy.
2. Restore previous ECS task definition revision.
3. Scale old service desired count back.
4. Stop EC2 only after traffic is confirmed off.
