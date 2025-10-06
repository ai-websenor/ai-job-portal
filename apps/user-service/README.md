# User Service - AI Job Portal

## Overview

The User Service is a microservice responsible for managing job seeker profiles, including personal information, work experience, education, skills, certifications, resumes, and job preferences.

## Features

- ✅ User profile management (CRUD operations)
- ✅ Profile completion tracking
- ✅ Profile photo upload (MinIO storage)
- ✅ Work experience management
- ✅ Education management
- ✅ Skills management with proficiency levels
- ✅ Certifications management
- ✅ Resume upload and management
- ✅ Job preferences configuration
- ✅ Document management
- ✅ Profile analytics and views tracking
- ✅ Profile visibility controls (public/private/semi-private)
- ✅ gRPC communication with auth-service for authentication

## Tech Stack

- **Framework**: NestJS 10.3
- **Runtime**: Node.js 20+
- **Server**: Fastify
- **Database**: PostgreSQL with Drizzle ORM
- **Object Storage**: MinIO (S3-compatible)
- **Cache**: Redis
- **Documentation**: Swagger/OpenAPI
- **Authentication**: gRPC with auth-service
- **Validation**: class-validator, class-transformer
- **Image Processing**: Sharp

## Architecture

```
┌────────────────┐
│  Auth Service  │ (gRPC Server)
└────────┬───────┘
         │ gRPC
         ▼
┌────────────────────────────────────────┐
│          User Service                   │
│  ┌────────────────────────────────┐   │
│  │  Controllers (REST API)         │   │
│  └──────────┬─────────────────────┘   │
│             ▼                           │
│  ┌────────────────────────────────┐   │
│  │  Services (Business Logic)      │   │
│  └──────────┬─────────────────────┘   │
│             ▼                           │
│  ┌──────────────────┐  ┌────────────┐ │
│  │  Database (PostgreSQL) │  │  MinIO     │ │
│  │  (Drizzle ORM)   │  │  (Storage) │ │
│  └──────────────────┘  └────────────┘ │
└────────────────────────────────────────┘
```

## Prerequisites

- Node.js 20.x or higher
- pnpm 8.x or higher
- Docker and Docker Compose
- PostgreSQL 15
- Redis 7
- MinIO (included in docker-compose)

## Installation

```bash
# Navigate to project root
cd AI-Job-Portal

# Install dependencies
pnpm install

# Copy environment variables
cp apps/user-service/.env.example apps/user-service/.env
```

## Configuration

### Environment Variables

Update `apps/user-service/.env` with your configuration:

```env
# Application
PORT=3002
GRPC_PORT=50052
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_job_portal

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

# Auth Service
AUTH_SERVICE_GRPC_URL=localhost:50051

# Upload Limits
MAX_FILE_SIZE=5242880  # 5MB
MAX_IMAGE_SIZE=2097152  # 2MB
```

## Development

### Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, MinIO
docker-compose up -d postgres redis minio
```

### Run Database Migrations

```bash
# Generate migrations
pnpm --filter @ai-job-portal/database db:generate

# Push migrations to database
pnpm --filter @ai-job-portal/database db:push
```

### Start Development Server

```bash
# From project root
pnpm --filter @ai-job-portal/user-service dev

# Or from user-service directory
cd apps/user-service
pnpm dev
```

The service will be available at:
- **API**: http://localhost:3002
- **Swagger Docs**: http://localhost:3002/api/docs
- **gRPC**: localhost:50052

### MinIO Console

Access MinIO console at http://localhost:9001

- Username: `minioadmin`
- Password: `minioadmin123`

## API Endpoints

### Profile Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/profile` | Create profile | ✅ |
| GET | `/api/v1/profile` | Get user profile | ✅ |
| PUT | `/api/v1/profile` | Update profile | ✅ |
| DELETE | `/api/v1/profile` | Delete profile | ✅ |
| GET | `/api/v1/profile/completion` | Get completion status | ✅ |

### Work Experience

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/experience` | List experiences | ✅ |
| POST | `/api/v1/experience` | Add experience | ✅ |
| PUT | `/api/v1/experience/:id` | Update experience | ✅ |
| DELETE | `/api/v1/experience/:id` | Delete experience | ✅ |

### Education

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/education` | List education | ✅ |
| POST | `/api/v1/education` | Add education | ✅ |
| PUT | `/api/v1/education/:id` | Update education | ✅ |
| DELETE | `/api/v1/education/:id` | Delete education | ✅ |

### Skills

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/skills` | List profile skills | ✅ |
| POST | `/api/v1/skills` | Add skill | ✅ |
| PUT | `/api/v1/skills/:id` | Update skill | ✅ |
| DELETE | `/api/v1/skills/:id` | Remove skill | ✅ |
| GET | `/api/v1/skills/suggestions` | Get skill suggestions | ✅ |

### Certifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/certifications` | List certifications | ✅ |
| POST | `/api/v1/certifications` | Add certification | ✅ |
| PUT | `/api/v1/certifications/:id` | Update certification | ✅ |
| DELETE | `/api/v1/certifications/:id` | Delete certification | ✅ |

### Resumes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/resumes` | List resumes | ✅ |
| POST | `/api/v1/resumes/upload` | Upload resume | ✅ |
| GET | `/api/v1/resumes/:id` | Download resume | ✅ |
| DELETE | `/api/v1/resumes/:id` | Delete resume | ✅ |
| PUT | `/api/v1/resumes/:id/default` | Set default resume | ✅ |

### Job Preferences

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/preferences` | Get preferences | ✅ |
| PUT | `/api/v1/preferences` | Update preferences | ✅ |

### Documents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/documents` | List documents | ✅ |
| POST | `/api/v1/documents` | Upload document | ✅ |
| DELETE | `/api/v1/documents/:id` | Delete document | ✅ |

### Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/analytics` | Get profile analytics | ✅ |
| GET | `/api/v1/analytics/views` | Get profile views | ✅ |

## Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov

# E2E tests
pnpm test:e2e
```

## Building

```bash
# Build for production
pnpm build

# Build specific modules
pnpm --filter @ai-job-portal/user-service build
```

## Docker

### Build Docker Image

```bash
# From project root
docker build -f apps/user-service/Dockerfile -t ai-job-portal-user-service .
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# Start only user-service
docker-compose up -d user-service

# View logs
docker-compose logs -f user-service
```

## File Upload Limits

- **Resume/Documents**: Max 5MB
- **Profile Photos**: Max 2MB
- **Allowed Image Types**: JPEG, PNG, WebP
- **Allowed Document Types**: PDF, DOC, DOCX

## MinIO Buckets

The service automatically creates the following buckets:

- `profiles` - Profile photos
- `resumes` - Resume files
- `documents` - ID proofs, certificates, etc.
- `certificates` - Certification files

## gRPC Communication

The user-service communicates with auth-service via gRPC for:

- JWT token validation
- User information retrieval
- Authorization checks

### Proto Definition

See `proto/auth.proto` for the complete gRPC service definition.

## Project Structure

```
apps/user-service/
├── src/
│   ├── profile/              # Profile module
│   ├── work-experience/      # Work experience module
│   ├── education/            # Education module
│   ├── skills/               # Skills module
│   ├── certifications/       # Certifications module
│   ├── resumes/              # Resume management
│   ├── preferences/          # Job preferences
│   ├── documents/            # Document management
│   ├── analytics/            # Profile analytics
│   ├── storage/              # MinIO storage service
│   ├── grpc/                 # gRPC clients
│   ├── database/             # Database module
│   ├── common/               # Shared utilities
│   │   ├── decorators/       # Custom decorators
│   │   ├── guards/           # Auth guards
│   │   ├── interceptors/     # Interceptors
│   │   ├── pipes/            # Custom pipes
│   │   └── filters/          # Exception filters
│   ├── config/               # Configuration
│   ├── app.module.ts
│   └── main.ts
├── proto/                    # Proto definitions
├── test/                     # E2E tests
├── Dockerfile
├── package.json
└── README.md
```

## Common Issues

### MinIO Connection Issues

If you can't connect to MinIO:
1. Ensure MinIO container is running: `docker ps | grep minio`
2. Check MinIO logs: `docker logs ai-job-portal-minio`
3. Verify credentials in `.env`

### gRPC Connection Issues

If auth-service gRPC is unavailable:
1. Ensure auth-service is running on port 50051
2. Check `AUTH_SERVICE_GRPC_URL` in `.env`
3. Verify network connectivity

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Run migrations: `pnpm db:push`

## Contributing

1. Create feature branch from `main`
2. Follow existing code patterns
3. Write tests for new features
4. Update documentation
5. Create pull request

## Related Services

- **auth-service**: Authentication and authorization (port 3001)
- **job-service**: Job posting and search (port 3003)
- **api-gateway**: API Gateway (port 3000)

## License

Proprietary - AI Job Portal

## Support

For issues and questions, contact the development team.
