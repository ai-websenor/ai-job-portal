# AI Job Portal

A scalable job portal platform built with NestJS microservices architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (3000)                        │
│                    Routes & Authentication                       │
└──────────┬──────────┬──────────┬──────────┬──────────┬─────────┘
           │          │          │          │          │
    ┌──────▼───┐ ┌────▼────┐ ┌───▼───┐ ┌───▼────┐ ┌───▼────┐
    │   Auth   │ │  User   │ │  Job  │ │  App   │ │ Notif  │ ...
    │  (3001)  │ │ (3002)  │ │(3003) │ │ (3004) │ │ (3005) │
    └────┬─────┘ └────┬────┘ └───┬───┘ └───┬────┘ └───┬────┘
         │            │          │         │          │
    ┌────▼────────────▼──────────▼─────────▼──────────▼────┐
    │              PostgreSQL (RDS) + Redis (Valkey)        │
    └──────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Central entry point, routing, auth middleware |
| Auth Service | 3001 | Authentication, OAuth2, JWT, 2FA |
| User Service | 3002 | User profiles, candidates, employers |
| Job Service | 3003 | Job listings, categories, skills, search |
| Application Service | 3004 | Job applications, interviews, offers |
| Notification Service | 3005 | Email (SES), SMS, push notifications |
| Payment Service | 3006 | Payments (Stripe, Razorpay), subscriptions |
| Admin Service | 3007 | Admin dashboard, moderation, analytics |

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10 (Fastify)
- **Database**: PostgreSQL 15 (AWS RDS)
- **Cache**: Redis 7 / Valkey 8 (AWS ElastiCache)
- **ORM**: Drizzle
- **Package Manager**: pnpm 9+
- **Build**: Turbo
- **Container**: Docker

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

```bash
# Copy example env file
cp .env.dev.example .env.dev

# Edit with your values
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
```

### 3. Start Infrastructure (Docker)

```bash
# Start PostgreSQL, Redis, LocalStack
pnpm docker:up
```

### 4. Run Services (Development)

```bash
# Run all services
pnpm dev

# Or run individual services
pnpm dev:gateway      # API Gateway (3000)
pnpm dev:auth         # Auth Service (3001)
pnpm dev:user         # User Service (3002)
pnpm dev:job          # Job Service (3003)
pnpm dev:application  # Application Service (3004)
pnpm dev:notification # Notification Service (3005)
pnpm dev:payment      # Payment Service (3006)
pnpm dev:admin        # Admin Service (3007)
```

### 5. Access Swagger Docs

- Gateway: http://localhost:3000/api/docs
- Auth: http://localhost:3001/api/docs
- User: http://localhost:3002/api/docs
- Job: http://localhost:3003/api/docs
- Application: http://localhost:3004/api/docs
- Notification: http://localhost:3005/api/docs
- Payment: http://localhost:3006/api/docs
- Admin: http://localhost:3007/api/docs

## Docker Deployment

### Build & Run All Services

```bash
# Build all service images
pnpm docker:build

# Start everything (infra + services)
pnpm docker:start

# View logs
pnpm docker:logs

# Check status
pnpm docker:ps

# Stop all
pnpm docker:stop

# Stop and remove containers
pnpm docker:down
```

### Build Individual Service

```bash
# Build specific service
docker build --build-arg SERVICE=auth-service -t ai-job-portal-auth .

# Run it
docker run -p 3001:3001 --env-file .env.dev ai-job-portal-auth
```

### Docker Compose Services

```bash
# Infrastructure only (local dev)
pnpm docker:up

# All services
pnpm docker:start

# Services only (assumes infra running)
pnpm docker:start:services

# Management tools (pgAdmin, Redis Commander)
pnpm docker:tools
```

## Project Structure

```
ai-job-portal/
├── apps/                      # Microservices
│   ├── api-gateway/           # Port 3000
│   ├── auth-service/          # Port 3001
│   ├── user-service/          # Port 3002
│   ├── job-service/           # Port 3003
│   ├── application-service/   # Port 3004
│   ├── notification-service/  # Port 3005
│   ├── payment-service/       # Port 3006
│   └── admin-service/         # Port 3007
├── packages/                  # Shared packages
│   ├── common/                # Utilities, filters, pipes
│   ├── database/              # Drizzle schemas
│   ├── types/                 # Shared TypeScript types
│   └── aws/                   # AWS SDK wrappers
├── docker/                    # Docker configuration
│   ├── docker-compose.yml     # All services
│   └── init-localstack.sh     # LocalStack setup
├── Dockerfile                 # Multi-stage build
├── .env.dev                   # Local development
└── .env.deploy                # AWS deployment
```

## Environment Files

| File | Purpose |
|------|---------|
| `.env.dev` | Local development (Docker Redis) |
| `.env.deploy` | AWS deployment (ElastiCache Valkey) |
| `.env.services.example` | Template for service configs |

## Database

```bash
# Generate migrations
pnpm db:generate

# Push schema to database
pnpm db:push
```

## AWS Resources

### Development Environment
- **RDS**: PostgreSQL 15 (db.t3.micro)
- **ElastiCache**: Valkey 8 (cache.t3.micro) - VPC only
- **Region**: ap-south-1 (Mumbai)

### Local Development
- PostgreSQL via Docker
- Redis via Docker
- LocalStack for S3/SES/SQS

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all services in dev mode |
| `pnpm build` | Build all services |
| `pnpm lint` | Run linter |
| `pnpm test` | Run tests |
| `pnpm docker:up` | Start Docker infrastructure |
| `pnpm docker:build` | Build Docker images |
| `pnpm docker:start` | Start all containers |
| `pnpm docker:logs` | Stream container logs |
| `pnpm docker:down` | Stop and remove containers |

## Management Tools

When running Docker:
- **pgAdmin**: http://localhost:5050 (admin@aijobportal.com / admin)
- **Redis Commander**: http://localhost:8081

```bash
# Start management tools
pnpm docker:tools
```

## Health Checks

Each service exposes health endpoint:
```
GET /api/v1/health
```

API Gateway aggregates all service health:
```
GET /api/v1/health/services
```

## License

Private - All rights reserved
