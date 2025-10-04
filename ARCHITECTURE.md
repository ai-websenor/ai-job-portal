# AI Job Portal - Microservices Architecture Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Design Principles](#design-principles)
3. [Microservices Communication](#microservices-communication)
4. [Database Architecture](#database-architecture)
5. [Security Architecture](#security-architecture)
6. [Scalability & Performance](#scalability--performance)
7. [Deployment Architecture](#deployment-architecture)
8. [Monitoring & Observability](#monitoring--observability)

---

## Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                          │
│                   (React/Next.js - TypeScript)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ HTTPS/REST API
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                       API Gateway (Fastify)                       │
│  - Authentication Middleware                                      │
│  - Rate Limiting & CORS                                          │
│  - Request/Response Transformation                               │
│  - Circuit Breaker Pattern                                       │
└────────────┬────────────┬────────────┬────────────┬─────────────┘
             │            │            │            │
    ┌────────▼───┐ ┌─────▼────┐ ┌────▼─────┐ ┌───▼──────┐
    │   Auth     │ │   User   │ │   Job    │ │  Payment │
    │  Service   │ │  Service │ │  Service │ │  Service │
    │  :3001     │ │  :3002   │ │  :3003   │ │  :3006   │
    └────────────┘ └──────────┘ └──────────┘ └──────────┘
                               │
             ┌─────────────────┴──────────────────┐
             │                                     │
    ┌────────▼────────┐              ┌───────────▼──────────┐
    │   PostgreSQL    │              │   Elasticsearch      │
    │   (Primary DB)  │              │   (Job Search)       │
    └─────────────────┘              └──────────────────────┘
                               │
             ┌─────────────────┴──────────────────┐
             │                                     │
    ┌────────▼────────┐              ┌───────────▼──────────┐
    │     Redis       │              │    RabbitMQ          │
    │   (Cache)       │              │  (Message Queue)     │
    └─────────────────┘              └──────────────────────┘
                               │
             ┌─────────────────┴──────────────────┐
             │                                     │
    ┌────────▼────────────────────────────────────▼──────────┐
    │              AI/ML Services (Python/FastAPI)            │
    │  - Resume Parser    - Job Recommender   - Chatbot      │
    │  - Quality Scorer   - JD Generator     - Skill Extractor│
    └──────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Microservices Principles

**Single Responsibility**
- Each microservice has one specific business responsibility
- Clear boundaries between services
- Independent deployability

**Loose Coupling**
- Services communicate via well-defined APIs
- No direct database access between services
- Event-driven architecture for async operations

**High Cohesion**
- Related functionalities grouped together
- Shared data models within service boundaries
- Business logic encapsulated within services

### 2. API Design Principles

**RESTful API Guidelines**
- Resource-based URLs
- HTTP methods for CRUD operations
- Proper status codes
- Versioned APIs (v1, v2)

**Request/Response Format**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### 3. Data Management Principles

**Database per Service**
- Each microservice owns its database
- No cross-service database queries
- Data consistency via events

**CQRS Pattern (where applicable)**
- Separate read and write models
- Optimized query performance
- Event sourcing for audit trail

**Eventual Consistency**
- Accept eventual consistency for non-critical data
- Use saga pattern for distributed transactions
- Compensating transactions for rollbacks

---

## Microservices Communication

### 1. Synchronous Communication (REST/gRPC)

**Use Cases:**
- Real-time data requirements
- Request-response workflows
- User-facing operations

**Implementation:**
```typescript
// Example: API Gateway to Auth Service
const response = await this.httpService.post(
  `${authServiceUrl}/validate-token`,
  { token },
  { timeout: 5000 }
);
```

**Circuit Breaker Pattern:**
- Prevent cascading failures
- Fallback mechanisms
- Retry logic with exponential backoff

### 2. Asynchronous Communication (RabbitMQ)

**Use Cases:**
- Event-driven workflows
- Non-blocking operations
- Background job processing

**Event Types:**
- `user.registered` - New user signup
- `job.posted` - New job created
- `application.submitted` - Job application
- `payment.completed` - Payment success
- `notification.send` - Send notification

**Implementation:**
```typescript
// Example: Publish event
await this.rabbitMQ.publish('user.registered', {
  userId: user.id,
  email: user.email,
  timestamp: new Date()
});

// Example: Subscribe to event
@EventPattern('user.registered')
async handleUserRegistered(data: UserRegisteredEvent) {
  await this.sendWelcomeEmail(data.email);
}
```

### 3. Service Mesh (Future)

**Istio/Linkerd for:**
- Service discovery
- Load balancing
- Traffic management
- Security (mTLS)
- Observability

---

## Database Architecture

### 1. PostgreSQL Schema Design

**Users Domain:**
```sql
-- Users table (shared across auth and user services)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'job_seeker',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Job Seekers table
CREATE TABLE job_seekers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(255),
  bio TEXT,
  resume_url VARCHAR(500),
  video_resume_url VARCHAR(500),
  skills TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Employers table
CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  company_logo VARCHAR(500),
  website VARCHAR(255),
  industry VARCHAR(100),
  is_verified BOOLEAN DEFAULT false,
  subscription_plan subscription_plan DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Jobs Domain:**
```sql
-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  job_type job_type NOT NULL,
  experience_level experience_level NOT NULL,
  location VARCHAR(255) NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  skills TEXT[],
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  job_seeker_id UUID REFERENCES job_seekers(id) ON DELETE CASCADE,
  status application_status DEFAULT 'applied',
  cover_letter TEXT,
  resume_url VARCHAR(500),
  applied_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Database Indexing Strategy

**Primary Indexes:**
- Primary keys (UUID)
- Foreign keys
- Unique constraints (email)

**Secondary Indexes:**
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_jobs_active ON jobs(is_active) WHERE is_active = true;
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_seeker ON applications(job_seeker_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Full-text search indexes
CREATE INDEX idx_jobs_title_gin ON jobs USING gin(to_tsvector('english', title));
CREATE INDEX idx_jobs_description_gin ON jobs USING gin(to_tsvector('english', description));
```

### 3. Elasticsearch Mapping

**Jobs Index Mapping:**
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text" },
      "job_type": { "type": "keyword" },
      "location": { "type": "keyword" },
      "skills": { "type": "keyword" },
      "salary_min": { "type": "integer" },
      "salary_max": { "type": "integer" },
      "created_at": { "type": "date" }
    }
  }
}
```

### 4. Redis Caching Strategy

**Cache Keys:**
- `user:{userId}` - User profile (TTL: 1 hour)
- `job:{jobId}` - Job details (TTL: 30 minutes)
- `jobs:featured` - Featured jobs list (TTL: 15 minutes)
- `search:{hash}` - Search results (TTL: 5 minutes)
- `session:{sessionId}` - User session (TTL: 7 days)

**Cache Invalidation:**
- Write-through cache
- Event-based invalidation
- TTL-based expiration

---

## Security Architecture

### 1. Authentication Flow

```
User Login Request
      ↓
API Gateway validates credentials
      ↓
Auth Service verifies user
      ↓
Generate JWT (Access + Refresh)
      ↓
Store session in Redis
      ↓
Return tokens to client
      ↓
Client stores tokens (httpOnly cookies)
```

### 2. JWT Token Structure

**Access Token (7 days TTL):**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "job_seeker",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Refresh Token (30 days TTL):**
```json
{
  "sub": "user-uuid",
  "tokenId": "refresh-token-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 3. Authorization (RBAC)

**Roles:**
- `job_seeker` - Job seekers/candidates
- `employer` - Company/employer accounts
- `team_member` - Employer's team members
- `admin` - Platform administrators

**Permissions:**
```typescript
const permissions = {
  job_seeker: ['view:jobs', 'apply:job', 'update:own_profile'],
  employer: ['create:job', 'view:applications', 'schedule:interview'],
  team_member: ['view:applications', 'update:application_status'],
  admin: ['*'] // All permissions
};
```

### 4. API Security

**Rate Limiting:**
- 100 requests per minute per IP
- 1000 requests per hour per user
- Distributed rate limiting via Redis

**CORS Policy:**
```typescript
{
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

**Security Headers (Helmet.js):**
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security

---

## Scalability & Performance

### 1. Horizontal Scaling

**Auto-scaling Rules:**
```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2. Load Balancing

**Nginx Configuration:**
```nginx
upstream api_gateway {
  least_conn;
  server gateway-1:3000 weight=3;
  server gateway-2:3000 weight=3;
  server gateway-3:3000 weight=2;
}

server {
  listen 80;
  location / {
    proxy_pass http://api_gateway;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### 3. Caching Strategy

**Multi-Level Cache:**
1. **L1 Cache** - In-memory (Node.js)
2. **L2 Cache** - Redis (distributed)
3. **L3 Cache** - CDN (Cloudflare)

**Cache Aside Pattern:**
```typescript
async getJob(id: string) {
  // Check L1 cache
  let job = this.memoryCache.get(`job:${id}`);
  if (job) return job;

  // Check L2 cache (Redis)
  job = await this.redis.get(`job:${id}`);
  if (job) {
    this.memoryCache.set(`job:${id}`, job, 300); // 5 min
    return JSON.parse(job);
  }

  // Fetch from database
  job = await this.db.jobs.findById(id);
  await this.redis.setex(`job:${id}`, 1800, JSON.stringify(job)); // 30 min
  this.memoryCache.set(`job:${id}`, job, 300);

  return job;
}
```

### 4. Database Optimization

**Connection Pooling:**
```typescript
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ai_job_portal',
  max: 20, // max connections
  min: 5,  // min connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Read Replicas:**
- Write operations → Primary DB
- Read operations → Read replicas
- Load balancing across replicas

**Query Optimization:**
- Use prepared statements
- Implement pagination
- Select specific columns
- Avoid N+1 queries

---

## Deployment Architecture

### 1. Development Environment

```yaml
# docker-compose.dev.yml
services:
  api-gateway:
    build: ./apps/api-gateway
    ports: ["3000:3000"]
    volumes:
      - ./apps/api-gateway:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

### 2. Production Environment (Kubernetes)

**Namespace:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-job-portal-prod
```

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: ai-job-portal-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: ai-job-portal/api-gateway:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/readiness
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 5
```

**Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: ai-job-portal-prod
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

### 3. CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ai-job-portal/api-gateway:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: azure/k8s-deploy@v4
        with:
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: |
            ai-job-portal/api-gateway:latest
```

---

## Monitoring & Observability

### 1. Metrics (Prometheus)

**Custom Metrics:**
```typescript
import { Counter, Histogram } from 'prom-client';

// Request counter
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Response time histogram
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
});
```

### 2. Logging (ELK Stack)

**Structured Logging:**
```typescript
logger.info('User login successful', {
  userId: user.id,
  email: user.email,
  ip: request.ip,
  timestamp: new Date().toISOString(),
});
```

**Log Levels:**
- ERROR: Application errors
- WARN: Warning messages
- INFO: General information
- DEBUG: Debug information
- TRACE: Detailed trace

### 3. Tracing (Jaeger)

**Distributed Tracing:**
```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('api-gateway');

async handleRequest(request: Request) {
  const span = tracer.startSpan('handle-request');

  try {
    // Business logic
    await this.processRequest(request);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
  } finally {
    span.end();
  }
}
```

### 4. Alerting (PagerDuty/Slack)

**Alert Rules:**
```yaml
groups:
- name: api-gateway-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    annotations:
      summary: High error rate detected

  - alert: HighLatency
    expr: http_request_duration_seconds{quantile="0.95"} > 2
    for: 5m
    annotations:
      summary: High API latency detected
```

---

## Best Practices & Guidelines

### 1. Code Organization
- Follow NestJS module structure
- Use dependency injection
- Implement repository pattern
- Separate business logic from controllers

### 2. Error Handling
- Use custom exception filters
- Implement circuit breakers
- Graceful degradation
- Comprehensive error logging

### 3. Testing Strategy
- Unit tests (80%+ coverage)
- Integration tests
- E2E tests
- Load testing
- Security testing

### 4. Documentation
- API documentation (Swagger)
- Code documentation (TSDoc)
- Architecture diagrams
- Runbooks for operations

---

**Version:** 1.0.0
**Last Updated:** 2025-10-04
**Maintained By:** Technical Architecture Team
