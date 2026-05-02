# ai-prototype-service

Self-hosted small-model AI service for the Job Portal — replacement for the
SageMaker Mistral 14B endpoint that was decommissioned 2026-04-30 (issue
#241). Tracer-bullet scaffold from #238; real AI logic lands in #242
(resume parser), #243 (job match + skill extraction), and #246 (resume parser
end-to-end + snapshot tests).

## Routing

The ALB on `ai-job-portal-dev` forwards `/ai-prototype/*` (path-based
listener rule, priority 20) to this service. ALB does **not** strip the
prefix — every route in this app must live under `/ai-prototype`.

| Endpoint | Description |
| -------- | ----------- |
| `GET /ai-prototype/healthz` | Returns `{"status":"ok"}` once startup completes; 503 during cold-start. |

Demo URL (dev):
```
http://ai-job-portal-dev-alb-1152570158.ap-south-1.elb.amazonaws.com/ai-prototype/healthz
```

Internal Cloud Map: `ai-prototype-service.ai-job-portal-dev.local:3011`

## Local dev

```bash
cd apps/ai-prototype-service
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -v          # 2 behavior tests
uvicorn app.main:app --host 127.0.0.1 --port 3011
curl http://127.0.0.1:3011/ai-prototype/healthz
```

Local Python 3.12 is recommended over 3.14 — `pydantic-core` wheels lag for
3.14 and force a Rust source compile. The runtime image is Python 3.11.

## Build + deploy

CI does this automatically — see `.github/workflows/deploy-dev.yml`. For
manual deploys:

```bash
# 1. Authenticate
aws ecr get-login-password --profile jobportal --region ap-south-1 \
  | docker login --username AWS --password-stdin \
      868991777791.dkr.ecr.ap-south-1.amazonaws.com

# 2. Build (linux/amd64 — Fargate is x86)
docker build --platform linux/amd64 \
  -t 868991777791.dkr.ecr.ap-south-1.amazonaws.com/ai-job-portal/ai-prototype-service:latest .

# 3. Push
docker push 868991777791.dkr.ecr.ap-south-1.amazonaws.com/ai-job-portal/ai-prototype-service:latest

# 4. Roll the ECS service
aws ecs update-service --cluster ai-job-portal-dev \
  --service ai-prototype-service --force-new-deployment \
  --profile jobportal --region ap-south-1
```

## Infrastructure

Provisioned by `infra/ai-prototype-service/terraform/`:

| Resource | Purpose |
| -------- | ------- |
| `aws_ecr_repository` | `ai-job-portal/ai-prototype-service` (keeps last 10 images) |
| `aws_cloudwatch_log_group` | `/ecs/ai-prototype-service` (14d retention) |
| `aws_ecs_task_definition` | 0.5 vCPU + 4GB, port 3011, no in-container healthcheck |
| `aws_ecs_service` | desired_count=1, FARGATE, public subnets, target-group bound, Cloud Map registered |
| `aws_lb_target_group` | path `/ai-prototype/healthz`, 200 matcher, 30s interval |
| `aws_lb_listener_rule` | priority 20, path-pattern `/ai-prototype/*` |
| `aws_security_group_rule` | adds port 3011 ingress on the shared task SG (existing rule covered 3000-3009 only) |
| `aws_service_discovery_service` | Cloud Map A-record |

To deploy / re-apply:

```bash
cd infra/ai-prototype-service/terraform
terraform init
terraform apply -var env=dev
```

## Healthcheck design

ALB target-group healthcheck is the single source of truth. The in-container
ECS healthcheck was intentionally dropped — keeping two synchronized paths
created drift risk. If the container can't respond on
`/ai-prototype/healthz`, ALB deregisters it and ECS rolls a new task.

The `/healthz` handler returns 503 (not 200) until FastAPI's lifespan event
sets `app.state.ready = True`. This prevents ALB from registering the target
during cold-start, when uvicorn is bound but model-load (added in #242,
#246) hasn't finished.

## Image notes

- Multi-stage Dockerfile: builder installs deps with `pip install --target=`,
  runtime stage copies them into `site-packages`. Console scripts (`uvicorn`,
  `fastapi`) are NOT preserved by this layout — invoke as Python modules
  (`python -m uvicorn …`).
- `torch==2.5.1+cpu` pinned via `--extra-index-url`. Do not let pip resolve
  `torch` from the default index — that pulls the 2GB CUDA build.
- Final image is ~270 MB (no models loaded yet).
- Runs as non-root `appuser`.

## Why path-based routing (not subdomain)

Existing `/ai/*` (the now-decommissioned SageMaker route) on the same ALB
sets the precedent. Subdomain routing would have required ACM cert + Route53
work for one service, which isn't worth it for a prototype. Trade-off: every
route must remember to live under `/ai-prototype`.
