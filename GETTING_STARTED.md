# Getting Started Guide - AI Job Portal

This guide will help you set up the AI Job Portal development environment and start building microservices.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** (v20.0.0 or higher) - [Download](https://nodejs.org/)
- **pnpm** (v8.0.0 or higher) - [Install](https://pnpm.io/installation)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **Git** - [Download](https://git-scm.com/downloads)

### Optional Software
- **PostgreSQL** (v15) - If not using Docker
- **Redis** (v7) - If not using Docker
- **VS Code** - Recommended IDE

---

## 🚀 Quick Start (5 minutes)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd AI-Job-Portal
```

### Step 2: Install Dependencies

```bash
# Install pnpm globally (if not installed)
npm install -g pnpm

# Install project dependencies
pnpm install
```

### Step 3: Environment Setup

```bash
# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### Step 4: Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, Elasticsearch, RabbitMQ
docker-compose up -d postgres redis elasticsearch rabbitmq

# Check services are running
docker-compose ps
```

### Step 5: Initialize Database

```bash
# Generate Drizzle ORM migrations
pnpm db:generate

# Push schema to database
pnpm db:push
```

### Step 6: Start Development

```bash
# Start all microservices
pnpm dev

# Or start specific service
pnpm --filter @ai-job-portal/api-gateway dev
```

---

## 📁 Project Structure

```
ai-job-portal/
├── apps/                       # Microservices
│   ├── api-gateway/           # Entry point (Port 3000)
│   ├── auth-service/          # Authentication
│   ├── user-service/          # User management
│   └── ...
├── packages/                   # Shared code
│   ├── common/                # Utilities
│   ├── database/              # Database schemas
│   ├── types/                 # TypeScript types
│   └── config/                # Configuration
├── DOCS/                       # Documentation
├── docker-compose.yml         # Docker services
├── turbo.json                 # Turborepo config
└── pnpm-workspace.yaml        # Workspace config
```

---

## 🔧 Development Workflow

### 1. Create New Microservice

```bash
# Navigate to apps directory
cd apps

# Copy existing service template
cp -r api-gateway my-new-service

# Update package.json
cd my-new-service
nano package.json
```

**Update package.json:**
```json
{
  "name": "@ai-job-portal/my-new-service",
  "version": "1.0.0",
  "description": "My New Service",
  ...
}
```

### 2. Add Service to Docker Compose

```yaml
# docker-compose.yml
my-new-service:
  build:
    context: .
    dockerfile: ./apps/my-new-service/Dockerfile
  container_name: ai-job-portal-my-service
  ports:
    - '3010:3010'
  environment:
    - NODE_ENV=development
    - PORT=3010
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_job_portal
```

### 3. Create Database Tables

**Define schema in `packages/database/src/schema/`:**

```typescript
// packages/database/src/schema/my-table.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const myTable = pgTable('my_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Generate and apply migration:**

```bash
pnpm db:generate
pnpm db:push
```

### 4. Implement Service Logic

**Controller Example:**
```typescript
// apps/my-service/src/my/my.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('my-resource')
@Controller('my-resource')
export class MyController {
  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  findAll() {
    return { message: 'Hello from my service!' };
  }
}
```

**Service Example:**
```typescript
// apps/my-service/src/my/my.service.ts
import { Injectable } from '@nestjs/common';
import { db, myTable } from '@ai-job-portal/database';

@Injectable()
export class MyService {
  async findAll() {
    return await db.select().from(myTable);
  }
}
```

### 5. Add Tests

```typescript
// apps/my-service/src/my/my.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

---

## 🧪 Testing

### Run All Tests

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

### Run Tests for Specific Service

```bash
pnpm --filter @ai-job-portal/api-gateway test
```

---

## 🐳 Docker Commands

### Basic Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api-gateway

# Rebuild services
docker-compose build

# Remove volumes
docker-compose down -v
```

### Database Commands

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d ai_job_portal

# Backup database
docker-compose exec postgres pg_dump -U postgres ai_job_portal > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres ai_job_portal < backup.sql
```

### Redis Commands

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# View all keys
docker-compose exec redis redis-cli KEYS '*'

# Flush all data
docker-compose exec redis redis-cli FLUSHALL
```

---

## 📊 Database Management

### Drizzle ORM Commands

```bash
# Generate migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (GUI)
pnpm db:studio
```

### Drizzle Studio

Drizzle Studio is a GUI for managing your database:

```bash
pnpm db:studio
# Opens at https://local.drizzle.studio
```

---

## 🔍 Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Gateway",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": [
        "--filter",
        "@ai-job-portal/api-gateway",
        "start:debug"
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('MyService');

logger.log('Info message');
logger.error('Error message', error.stack);
logger.warn('Warning message');
logger.debug('Debug message');
```

---

## 🌐 API Documentation

### Swagger UI

Access API documentation at:
- **API Gateway**: http://localhost:3000/api/docs
- **Auth Service**: http://localhost:3001/api/docs
- **User Service**: http://localhost:3002/api/docs

### Postman Collection

Import the Postman collection:

```bash
# Located at
./postman/ai-job-portal.postman_collection.json
```

---

## 🔐 Environment Variables

### Essential Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_job_portal

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
```

### Service-Specific Variables

Each microservice can have its own `.env` file:

```
apps/
├── api-gateway/.env
├── auth-service/.env
├── user-service/.env
└── ...
```

---

## 🚢 Deployment

### Development Deployment

```bash
# Build all services
pnpm build

# Start production servers
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```bash
# Build Docker images
docker build -t ai-job-portal/api-gateway:latest ./apps/api-gateway

# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n ai-job-portal
kubectl get services -n ai-job-portal
```

---

## 🛠️ Common Issues & Solutions

### Issue: pnpm install fails

**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Issue: Docker containers won't start

**Solution:**
```bash
# Check Docker is running
docker info

# Remove old containers and volumes
docker-compose down -v

# Restart Docker Desktop and try again
docker-compose up -d
```

### Issue: Database connection fails

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string in .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_job_portal

# Test connection
docker-compose exec postgres psql -U postgres -d ai_job_portal
```

### Issue: Port already in use

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

---

## 📚 Additional Resources

### Documentation
- [NestJS Documentation](https://docs.nestjs.com)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Turborepo Documentation](https://turbo.build/repo/docs)

### Internal Documentation
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Database Schema](./packages/database/README.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

## 🤝 Need Help?

### Support Channels
- **Slack**: #ai-job-portal-dev
- **Email**: dev@ai-job-portal.com
- **Issues**: [GitHub Issues](https://github.com/your-org/ai-job-portal/issues)

### Team Contacts
- **Tech Lead**: [Name] - [Email]
- **DevOps**: [Name] - [Email]
- **Backend Team**: [Names]

---

## ✅ Checklist for New Developers

- [ ] Install prerequisites (Node.js, pnpm, Docker)
- [ ] Clone repository
- [ ] Install dependencies (`pnpm install`)
- [ ] Copy `.env.example` to `.env`
- [ ] Start Docker services
- [ ] Initialize database
- [ ] Start development servers
- [ ] Access Swagger UI at http://localhost:3000/api/docs
- [ ] Run tests (`pnpm test`)
- [ ] Join team Slack channel
- [ ] Review architecture documentation
- [ ] Complete first ticket

---

**Happy Coding! 🚀**

If you encounter any issues, please reach out to the team or create an issue on GitHub.
