# User Service - Quick Start Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Running PostgreSQL (via docker-compose)
- Running Redis (via docker-compose)
- Running MinIO (via docker-compose)
- Running auth-service (for gRPC authentication)

## Quick Start (5 minutes)

### 1. Start Infrastructure

```bash
# From project root
docker-compose up -d postgres redis minio
```

Verify services are running:
```bash
docker ps
```

You should see:
- `ai-job-portal-postgres` on port 5432
- `ai-job-portal-redis` on port 6379
- `ai-job-portal-minio` on ports 9000, 9001

### 2. Run Database Migrations

```bash
# From project root
pnpm --filter @ai-job-portal/database db:push
```

This creates all necessary tables in PostgreSQL.

### 3. Set Environment Variables

```bash
# Copy example env file
cp apps/user-service/.env.example apps/user-service/.env

# Edit if needed (defaults work for local development)
nano apps/user-service/.env
```

### 4. Start User Service

```bash
# From project root
pnpm --filter @ai-job-portal/user-service dev
```

**Output:**
```
🚀 User Service is running on: http://localhost:3002
📚 API Documentation: http://localhost:3002/api/docs
🌍 Environment: development
```

### 5. Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| API | http://localhost:3002 | REST API endpoints |
| Swagger Docs | http://localhost:3002/api/docs | Interactive API documentation |
| MinIO Console | http://localhost:9001 | Object storage management |
| gRPC | localhost:50052 | gRPC server (internal) |

**MinIO Login:**
- Username: `minioadmin`
- Password: `minioadmin123`

## Testing the API

### Option 1: Use Swagger UI

1. Open http://localhost:3002/api/docs
2. Click **Authorize** button
3. Enter Bearer token from auth-service
4. Try the endpoints interactively

### Option 2: Use cURL

**1. Create Profile:**
```bash
curl -X POST http://localhost:3002/api/v1/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "1234567890",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "professionalSummary": "Software Engineer with 5 years experience",
    "visibility": "public"
  }'
```

**2. Get Profile:**
```bash
curl -X GET http://localhost:3002/api/v1/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**3. Add Work Experience:**
```bash
curl -X POST http://localhost:3002/api/v1/experience \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Tech Corp",
    "jobTitle": "Senior Developer",
    "employmentType": "full_time",
    "location": "New York, NY",
    "isCurrent": true,
    "startDate": "2020-01-01",
    "description": "Leading development team"
  }'
```

**4. Add Education:**
```bash
curl -X POST http://localhost:3002/api/v1/education \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "bachelors",
    "institution": "MIT",
    "degree": "Computer Science",
    "fieldOfStudy": "Software Engineering",
    "startDate": "2015-09-01",
    "endDate": "2019-05-31",
    "grade": "3.8 GPA"
  }'
```

**5. Get Profile Completion:**
```bash
curl -X GET http://localhost:3002/api/v1/profile/completion \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Option 3: Use Postman

Import the OpenAPI spec from http://localhost:3002/api/docs-json

## Common Commands

### Development
```bash
# Start dev server with hot reload
pnpm --filter @ai-job-portal/user-service dev

# Check TypeScript types
pnpm --filter @ai-job-portal/user-service tsc --noEmit

# Lint code
pnpm --filter @ai-job-portal/user-service lint
```

### Testing
```bash
# Run unit tests
pnpm --filter @ai-job-portal/user-service test

# Run tests in watch mode
pnpm --filter @ai-job-portal/user-service test:watch

# Run with coverage
pnpm --filter @ai-job-portal/user-service test:cov
```

### Build
```bash
# Build for production
pnpm --filter @ai-job-portal/user-service build

# Run production build
pnpm --filter @ai-job-portal/user-service start
```

## Docker Usage

### Build Docker Image
```bash
# From project root
docker build -f apps/user-service/Dockerfile -t user-service:latest .
```

### Run with Docker Compose
```bash
# Start all services including user-service
docker-compose up -d

# View logs
docker-compose logs -f user-service

# Stop all services
docker-compose down
```

## Troubleshooting

### Issue: Cannot connect to database
**Solution:**
```bash
# Ensure PostgreSQL is running
docker ps | grep postgres

# Check database URL in .env
cat apps/user-service/.env | grep DATABASE_URL

# Test connection
docker exec -it ai-job-portal-postgres psql -U postgres -d ai_job_portal
```

### Issue: MinIO buckets not created
**Solution:**
```bash
# Check MinIO logs
docker logs ai-job-portal-minio

# Restart user-service (it auto-creates buckets)
pnpm --filter @ai-job-portal/user-service dev
```

### Issue: gRPC auth-service connection failed
**Solution:**
```bash
# Ensure auth-service is running
curl http://localhost:3001/api/v1/health

# Check gRPC URL in .env
cat apps/user-service/.env | grep AUTH_SERVICE_GRPC_URL

# Should be: localhost:50051 (or auth-service:50051 in Docker)
```

### Issue: Port already in use
**Solution:**
```bash
# Find process using port 3002
lsof -i :3002

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3003
```

## Development Tips

### 1. Auto-reload on changes
The dev server automatically restarts when you modify code files.

### 2. Debug mode
```bash
# Start with debug logging
NODE_ENV=development DEBUG=* pnpm dev
```

### 3. Database changes
After modifying Drizzle schema:
```bash
pnpm --filter @ai-job-portal/database db:generate
pnpm --filter @ai-job-portal/database db:push
```

### 4. Clear MinIO data
```bash
# Stop MinIO
docker-compose stop minio

# Remove volume
docker volume rm ai-job-portal_minio-data

# Restart MinIO (creates new empty buckets)
docker-compose up -d minio
```

## API Authentication

All endpoints (except health checks) require JWT authentication:

```bash
Authorization: Bearer <your_jwt_token>
```

Get a token from auth-service:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

## Next Steps

1. ✅ Start the service
2. ✅ Test API endpoints
3. ✅ Create a profile
4. ✅ Add work experience and education
5. ✅ Upload profile photo (coming soon)
6. ✅ Explore Swagger documentation

## Support

- **Documentation**: See `README.md` for comprehensive docs
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **Issues**: Report bugs in the project repository

---

**Happy Coding! 🚀**
