# Nightly Shutdown — ECS + RDS + Valkey

Automation that pauses every billable dev resource on weekday nights and
restores them on weekday mornings:

- **ECS**: scale every service in `ai-job-portal-dev` to `desired-count=0`
- **RDS**: stop the `ai-job-portal-dev` DB instance (state-aware — only
  restarts what we stopped)
- **Valkey**: snapshot+delete the `ai-job-portal-dev-valkey` replication
  group, recreate from snapshot on startup

Issues: #240 added ECS; #244 added RDS + Valkey + ScheduleOrchestrator.

## Architecture

```
EventBridge cron
   ├── shutdown rule (14:30 UTC = 20:00 IST, Mon-Fri) → Lambda nightly-shutdown-dev
   └── startup  rule (03:30 UTC = 09:00 IST, Mon-Fri) → Lambda nightly-startup-dev

Lambda → ScheduleOrchestrator
   ├── shutdown order:  ECS → RDS → Valkey
   │     (drain tasks before pulling out their dependencies)
   └── startup  order:  Valkey → RDS → ECS
                        (cache + DB up before tasks try to connect)

Controllers
   ├── EcsController     — scale services to 0 / restore
   ├── RdsController     — stop_db_instance / start_db_instance + poll
   └── ValkeyController  — delete_replication_group(FinalSnapshotIdentifier)
                           / create_replication_group(SnapshotName)

State (SSM Parameter Store, all under STATE_SSM_PREFIX)
   ├── /<env>/<cluster>/<service>/desired-count    (ECS)
   ├── /<env>/rds/<db-id>/stopped-by-us            (RDS marker)
   ├── /<env>/valkey/<rg-id>/last-snapshot         (Valkey)
   └── /<env>/valkey/<rg-id>/config                (Valkey: cache.t3.micro etc.)
```

State lives in SSM (not DynamoDB) so operators can browse / clear it via the
AWS Console without running code. Path-segmented for easy `aws ssm
get-parameters-by-path` lookups.

### Why a marker (not just "is it stopped?") for RDS

A DB instance can be stopped manually by an operator. Without a marker, the
nightly job would happily restart that instance every weekday morning. The
controller only restarts an instance whose `/<env>/rds/<id>/stopped-by-us`
key it set itself, then deletes the key on success.

### Why snapshot+delete (not stop) for Valkey

ElastiCache replication groups don't support stop/start in place. The atomic
`delete_replication_group(FinalSnapshotIdentifier=...)` snapshots and removes
in one call; on startup we read the recorded config from SSM and call
`create_replication_group(SnapshotName=...)`. This means each weekday morning
the cluster is freshly recreated — fine for a dev cache (data is ephemeral).

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

- **Shutdown idempotent**: ECS keeps the original count (not 0); RDS skips if
  already stopped; Valkey skips if RG already deleted.
- **Startup idempotent**: ECS restores to recorded count; RDS only starts what
  it stopped; Valkey skips if RG already exists.
- **Missing state on startup**: ECS services with no recorded count are left
  untouched. RDS without marker is left stopped. Valkey without snapshot
  config raises `SnapshotNotFound` — failing loud is safer than recreating
  empty.
- **Empty cluster / already-deleted resources**: no-op, no errors.
- **One controller failure does not abort the rest**: the orchestrator
  collects errors and returns them in the Lambda result — partial shutdown
  is better than no shutdown.

## Troubleshooting

| Symptom                                  | Likely cause / fix                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Shutdown ran but services still up       | EventBridge → Lambda permission missing. Check `aws_lambda_permission` resource exists.    |
| Lambda errors on `UpdateService`         | IAM role missing `ecs:UpdateService` on cluster ARN. See `iam.tf`.                         |
| Startup restores wrong ECS count         | Inspect SSM params — first shutdown may have run after a manual scale-down to 0.           |
| Services restored to 0                   | State was wiped or never written. Re-run shutdown during business hours to re-record.      |
| RDS not restarting in the morning        | Marker missing — instance was already stopped before the nightly job ran. Start manually.  |
| RDS startup hits Lambda timeout          | Bigger DB taking >10 min to start. Bump `timeout` in `lambda.tf` (current 900s = AWS max). |
| Valkey startup raises `SnapshotNotFound` | `last-snapshot` SSM key missing — first morning after a state wipe. Create manually.       |
| Valkey ARG error: `SecurityGroupIds`     | DB was created via console/UI. Rerun shutdown to re-record fresh config.                   |

## Tests

```bash
cd lambda
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest -v
```

24 behavior tests cover the three controllers, the orchestrator, and the SSM
state store via `moto` mocks (with fake clients for paths moto doesn't
simulate, like ECS list pagination and RDS startup polling).

## File layout

```
infra/nightly-shutdown/
├── lambda/
│   ├── pyproject.toml
│   ├── src/
│   │   ├── controllers/{ecs,rds,valkey}_controller.py  # one resource type each
│   │   ├── orchestrator.py                             # ScheduleOrchestrator
│   │   ├── state/{memory,ssm}.py                       # state-store backends
│   │   └── handlers/{shutdown,startup}_handler.py      # Lambda entrypoints
│   └── tests/                                          # pytest + moto + fake clients
├── terraform/                                          # Lambda + EventBridge + IAM
└── scripts/                                            # manual override
```
