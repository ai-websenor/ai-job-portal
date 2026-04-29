# Nightly Shutdown — ECS

Automation that scales every ECS service in `ai-job-portal-dev` to
`desired-count=0` on weekday nights and restores them on weekday mornings, to
cut idle dev/staging spend.

This slice (issue #240) covers ECS only. RDS / Valkey / SageMaker land in
follow-up issues (#241, #242).

## Architecture

```
EventBridge cron
   ├── shutdown rule (14:30 UTC = 20:00 IST, Mon-Fri) → Lambda nightly-shutdown-dev
   └── startup  rule (03:30 UTC = 09:00 IST, Mon-Fri) → Lambda nightly-startup-dev

Lambda
   ├── EcsController.shutdown(env)  → for each service: record desired-count to SSM, scale to 0
   └── EcsController.startup(env)   → for each service: read recorded count from SSM, restore

State
   └── SSM Parameter Store under /nightly-shutdown/<env>/<cluster>/<service>/desired-count
```

State lives in SSM (not DynamoDB) so operators can browse / clear it via the
AWS Console without running code. Path-segmented for easy `aws ssm
get-parameters-by-path` lookups.

## Schedule

| Action   | Cron (UTC)                  | Local (IST) |
| -------- | --------------------------- | ----------- |
| shutdown | `cron(30 14 ? * MON-FRI *)` | 20:00 IST   |
| startup  | `cron(30 3  ? * MON-FRI *)` | 09:00 IST   |

Weekends are off entirely — Sat/Sun the Friday-night shutdown stays in effect
until Monday 09:00 IST.

## Deploy

```bash
cd terraform
terraform init
terraform plan -var env=dev
terraform apply -var env=dev
```

To deploy a second copy for staging:

```bash
terraform workspace new staging
terraform apply -var env=staging
```

## Manual override

The Lambdas can be triggered out-of-schedule:

```bash
# Force shutdown right now (e.g. before a long weekend)
./scripts/manual-shutdown.sh dev

# Force startup (e.g. someone needs dev during off-hours)
./scripts/manual-startup.sh dev
```

Or directly:

```bash
aws lambda invoke --function-name nightly-shutdown-dev \
  --profile jobportal --region ap-south-1 \
  --payload '{}' --cli-binary-format raw-in-base64-out /tmp/out.json
```

## Verifying state

Inspect what the controller recorded:

```bash
aws ssm get-parameters-by-path \
  --path /nightly-shutdown/dev/ai-job-portal-dev/ \
  --recursive \
  --profile jobportal --region ap-south-1
```

To wipe state and force startup to leave services untouched until next
shutdown re-records them:

```bash
aws ssm delete-parameters --names $(aws ssm get-parameters-by-path \
  --path /nightly-shutdown/dev --recursive \
  --query 'Parameters[].Name' --output text)
```

## Behavior guarantees

- **Shutdown idempotent**: running twice keeps the original count, not 0.
- **Startup idempotent**: running twice restores to the same recorded count.
- **Missing state on startup**: services with no recorded count are left
  untouched (intentional — operator can scale them manually).
- **Empty cluster**: no-op, no errors.

## Troubleshooting

| Symptom                               | Likely cause / fix                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Shutdown ran but services still up    | EventBridge → Lambda permission missing. Check `aws_lambda_permission` resource exists.    |
| Lambda errors on `UpdateService`      | IAM role missing `ecs:UpdateService` on cluster ARN. See `iam.tf`.                         |
| Startup restores wrong count          | Inspect SSM params — first shutdown may have run after a manual scale-down to 0.           |
| Services restored to 0                | State was wiped or never written. Re-run shutdown during business hours to re-record.      |

## Tests

```bash
cd lambda
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest -v
```

10 behavior tests cover the controller and SSM state store via `moto` mocks.

## File layout

```
infra/nightly-shutdown/
├── lambda/
│   ├── pyproject.toml
│   ├── src/
│   │   ├── controllers/ecs_controller.py     # shutdown/startup logic
│   │   ├── state/{memory,ssm}.py             # state-store backends
│   │   └── handlers/{shutdown,startup}_handler.py  # Lambda entrypoints
│   └── tests/                                # pytest + moto
├── terraform/                                # Lambda + EventBridge + IAM
└── scripts/                                  # manual override
```
