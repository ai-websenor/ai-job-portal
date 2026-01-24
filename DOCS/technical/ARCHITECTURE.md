# Microservices Architecture

## Overview

| Property | Value |
|----------|-------|
| Architecture | Microservices |
| Communication | REST + gRPC |
| Message Queue | RabbitMQ |
| Cache | Redis |
| Search | Elasticsearch |
| Database | PostgreSQL |

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Service Topology](#service-topology)
3. [Node.js Services](#nodejs-services)
4. [Python AI Services](#python-ai-services)
5. [Communication Patterns](#communication-patterns)
6. [Infrastructure Components](#infrastructure-components)
7. [Deployment Architecture](#deployment-architecture)
8. [Data Flow Diagrams](#data-flow-diagrams)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application<br/>React/Next.js]
        MOBILE[Mobile Apps<br/>React Native]
        ADMIN[Admin Dashboard<br/>React]
    end

    subgraph "Edge Layer"
        CDN[CDN<br/>CloudFront]
        LB[Load Balancer<br/>Nginx/ALB]
    end

    subgraph "API Gateway"
        GW[API Gateway<br/>Port 3000<br/>NestJS/Fastify]
    end

    subgraph "Core Services"
        AUTH[Auth Service<br/>3001 / 50051 gRPC]
        USER[User Service<br/>3002]
        JOB[Job Service<br/>3003 / 50052 gRPC]
        APP[Application Service<br/>3004]
    end

    subgraph "Supporting Services"
        NOTIF[Notification Service<br/>3005]
        PAY[Payment Service<br/>3006]
        ANALYTICS[Analytics Service<br/>3007]
        MSG[Messaging Service<br/>3008]
        ADMIN_SVC[Admin Service<br/>3009]
    end

    subgraph "AI/ML Services"
        RESUME[Resume Parser<br/>8001]
        RECOMMEND[Job Recommender<br/>8002]
        QUALITY[Quality Scorer<br/>8003]
        CHATBOT[Chatbot<br/>8004]
        JDGEN[JD Generator<br/>8005]
        SKILL[Skill Extractor<br/>8006]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>5432)]
        REDIS[(Redis<br/>6379)]
        ES[(Elasticsearch<br/>9200)]
        RABBIT[RabbitMQ<br/>5672]
        S3[Object Storage<br/>S3/MinIO]
    end

    WEB --> CDN
    MOBILE --> CDN
    ADMIN --> CDN
    CDN --> LB
    LB --> GW

    GW --> AUTH
    GW --> USER
    GW --> JOB
    GW --> APP
    GW --> NOTIF
    GW --> PAY
    GW --> ANALYTICS
    GW --> MSG
    GW --> ADMIN_SVC

    USER --> RESUME
    USER --> QUALITY
    JOB --> RECOMMEND
    JOB --> JDGEN
    JOB --> SKILL
    MSG --> CHATBOT

    AUTH --> PG
    AUTH --> REDIS
    USER --> PG
    USER --> S3
    JOB --> PG
    JOB --> ES
    APP --> PG
    APP --> RABBIT
    NOTIF --> RABBIT
    PAY --> PG
    ANALYTICS --> ES
```

---

## Service Topology

```mermaid
graph LR
    subgraph "External Traffic"
        CLIENT[Clients]
    end

    subgraph "Gateway Layer"
        GW[API Gateway<br/>:3000]
    end

    subgraph "Core Services"
        AUTH[Auth<br/>:3001/:50051]
        USER[User<br/>:3002]
        JOB[Job<br/>:3003/:50052]
        APP[Application<br/>:3004]
    end

    subgraph "Event-Driven Services"
        NOTIF[Notification<br/>:3005]
        ANALYTICS[Analytics<br/>:3007]
    end

    subgraph "Transaction Services"
        PAY[Payment<br/>:3006]
    end

    CLIENT -->|HTTPS| GW
    GW -->|HTTP| AUTH
    GW -->|HTTP| USER
    GW -->|HTTP| JOB
    GW -->|HTTP| APP
    GW -->|HTTP| PAY

    AUTH -.->|gRPC| USER
    AUTH -.->|gRPC| JOB
    AUTH -.->|gRPC| APP

    JOB -.->|gRPC| APP

    APP -->|Events| NOTIF
    APP -->|Events| ANALYTICS
    USER -->|Events| ANALYTICS
    JOB -->|Events| ANALYTICS
```

---

## Node.js Services

### Service Registry

| Service | HTTP Port | gRPC Port | Framework | Status |
|---------|-----------|-----------|-----------|--------|
| API Gateway | 3000 | - | NestJS/Fastify | Active |
| Auth Service | 3001 | 50051 | NestJS/Fastify | Active |
| User Service | 3002 | - | NestJS/Fastify | Active |
| Job Service | 3003 | 50052 | NestJS/Express | Active |
| Application Service | 3004 | - | NestJS/Express | Active |
| Notification Service | 3005 | - | NestJS | Planned |
| Payment Service | 3006 | - | NestJS | Planned |
| Analytics Service | 3007 | - | NestJS | Planned |
| Messaging Service | 3008 | - | NestJS | Planned |
| Admin Service | 3009 | - | NestJS | Planned |

### API Gateway (Port 3000)

```mermaid
graph LR
    subgraph "API Gateway"
        ROUTES[Route Handler]
        AUTH_MW[Auth Middleware]
        RATE[Rate Limiter]
        PROXY[HTTP Proxy]
    end

    CLIENT[Client] --> RATE
    RATE --> AUTH_MW
    AUTH_MW --> ROUTES
    ROUTES --> PROXY
    PROXY --> SERVICES[Backend Services]
```

**Responsibilities:**
- Request routing to microservices
- JWT validation via Auth Service
- Rate limiting (100 req/min default)
- Request/response logging
- Error handling & formatting

**Route Mappings:**

| Route Pattern | Target Service |
|---------------|----------------|
| `/api/v1/auth/*` | Auth Service (3001) |
| `/api/v1/profile/*` | User Service (3002) |
| `/api/v1/candidate/*` | User Service (3002) |
| `/api/v1/onboarding/*` | User Service (3002) |
| `/api/v1/experience/*` | User Service (3002) |
| `/api/v1/education/*` | User Service (3002) |
| `/api/v1/skills/*` | User Service (3002) |
| `/api/v1/certifications/*` | User Service (3002) |
| `/api/v1/resumes/*` | User Service (3002) |
| `/api/v1/preferences/*` | User Service (3002) |
| `/api/v1/documents/*` | User Service (3002) |
| `/api/v1/jobs/*` | Job Service (3003) |
| `/api/v1/company/*` | Job Service (3003) |
| `/api/v1/saved-searches/*` | Job Service (3003) |
| `/api/v1/applications/*` | Application Service (3004) |
| `/api/v1/status/*` | Application Service (3004) |
| `/api/v1/interviews/*` | Application Service (3004) |
| `/api/v1/employers/candidates/*` | Application Service (3004) |

---

### Auth Service (Port 3001 / gRPC 50051)

**Responsibilities:**
- User registration & login
- JWT token generation & refresh
- OAuth (Google, LinkedIn)
- OTP/2FA handling
- Password reset
- Email verification
- Session management

**gRPC Methods:**
```protobuf
service AuthService {
  rpc ValidateToken(TokenRequest) returns (UserInfo);
  rpc GetUserById(UserIdRequest) returns (User);
}
```

**Dependencies:**
- PostgreSQL (users, sessions, otps tables)
- Redis (session cache, rate limiting)
- External: Google OAuth, LinkedIn OAuth, SMS Gateway

---

### User Service (Port 3002)

**Responsibilities:**
- Profile CRUD operations
- Resume management & upload
- Work experience management
- Education records
- Skills & certifications
- Job preferences
- Document uploads
- Profile completeness tracking
- Onboarding flow

**Dependencies:**
- PostgreSQL (profiles, workExperiences, etc.)
- Object Storage (S3/MinIO for files)
- Auth Service (gRPC for token validation)
- AI Services (Resume Parser, Quality Scorer)

---

### Job Service (Port 3003 / gRPC 50052)

**Responsibilities:**
- Job posting CRUD
- Job categories management
- Skills management
- Job search (Elasticsearch)
- Saved jobs & searches
- Job recommendations
- Company profiles

**gRPC Methods:**
```protobuf
service JobService {
  rpc CreateJob(JobRequest) returns (Job);
  rpc FindOneJob(JobIdRequest) returns (Job);
  rpc FindAllJobs(SearchRequest) returns (JobList);
  rpc UpdateJob(JobUpdateRequest) returns (Job);
  rpc RemoveJob(JobIdRequest) returns (Empty);
  rpc SearchJobs(SearchCriteria) returns (JobList);
  rpc CreateCategory(CategoryRequest) returns (Category);
  rpc FindAllCategories(Empty) returns (CategoryList);
  rpc CreateSkill(SkillRequest) returns (Skill);
  rpc FindAllSkills(Empty) returns (SkillList);
}
```

**Dependencies:**
- PostgreSQL (jobs, jobCategories, etc.)
- Elasticsearch (job indexing & search)
- Auth Service (gRPC for token validation)
- AI Services (Job Recommender, JD Generator, Skill Extractor)

---

### Application Service (Port 3004)

**Responsibilities:**
- Job application submission
- Application status tracking
- Interview scheduling
- Applicant management for employers
- Application history audit
- Notes & tags on applicants

**Dependencies:**
- PostgreSQL (jobApplications, interviews, etc.)
- RabbitMQ (notification events)
- Job Service (gRPC for job details)
- Auth Service (gRPC for token validation)

---

## Python AI Services

### Service Registry

| Service | Port | ML Model | Framework | Status |
|---------|------|----------|-----------|--------|
| Resume Parser | 8001 | LayoutLM + BERT NER | FastAPI | Active |
| Job Recommender | 8002 | Sentence Transformers | FastAPI | Active |
| Quality Scorer | 8003 | BERT Classifier | FastAPI | Active |
| Chatbot | 8004 | DialoGPT | FastAPI | Planned |
| JD Generator | 8005 | T5/BART | FastAPI | Planned |
| Skill Extractor | 8006 | JobBERT | FastAPI | Planned |

### AI Service Architecture

```mermaid
graph TB
    subgraph "AI Gateway"
        AI_LB[Load Balancer]
    end

    subgraph "Resume Parser (8001)"
        RP_API[FastAPI]
        RP_MODEL[LayoutLM + BERT NER]
        RP_PROC[Document Processor]
    end

    subgraph "Job Recommender (8002)"
        JR_API[FastAPI]
        JR_MODEL[Sentence Transformers]
        JR_INDEX[Vector Index]
    end

    subgraph "Quality Scorer (8003)"
        QS_API[FastAPI]
        QS_MODEL[BERT Classifier]
        QS_RULES[Rule Engine]
    end

    subgraph "Chatbot (8004)"
        CB_API[FastAPI]
        CB_MODEL[DialoGPT]
        CB_CTX[Context Manager]
    end

    subgraph "JD Generator (8005)"
        JD_API[FastAPI]
        JD_MODEL[T5/BART]
        JD_TEMPLATE[Template Engine]
    end

    subgraph "Skill Extractor (8006)"
        SE_API[FastAPI]
        SE_MODEL[JobBERT]
        SE_TAX[Skill Taxonomy]
    end

    AI_LB --> RP_API
    AI_LB --> JR_API
    AI_LB --> QS_API
    AI_LB --> CB_API
    AI_LB --> JD_API
    AI_LB --> SE_API

    RP_API --> RP_PROC
    RP_PROC --> RP_MODEL

    JR_API --> JR_INDEX
    JR_INDEX --> JR_MODEL

    QS_API --> QS_RULES
    QS_RULES --> QS_MODEL

    CB_API --> CB_CTX
    CB_CTX --> CB_MODEL

    JD_API --> JD_TEMPLATE
    JD_TEMPLATE --> JD_MODEL

    SE_API --> SE_TAX
    SE_TAX --> SE_MODEL
```

### Resume Parser (Port 8001)

**Purpose:** Extract structured data from resume documents

**Input/Output:**
```json
// Request
{
  "file_url": "https://storage.../resume.pdf",
  "file_type": "pdf"
}

// Response
{
  "personal_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "work_experience": [...],
  "education": [...],
  "skills": [...],
  "confidence_scores": {...}
}
```

---

### Job Recommender (Port 8002)

**Purpose:** Generate personalized job recommendations

**Input/Output:**
```json
// Request
{
  "user_id": "uuid",
  "profile": {
    "skills": [...],
    "experience": [...],
    "preferences": {...}
  },
  "top_k": 10
}

// Response
{
  "recommendations": [
    {
      "job_id": "uuid",
      "score": 0.95,
      "reasons": ["skill_match", "location_match"]
    }
  ]
}
```

---

### Quality Scorer (Port 8003)

**Purpose:** Score resume quality and ATS compatibility

**Input/Output:**
```json
// Request
{
  "resume_text": "...",
  "target_job_description": "optional"
}

// Response
{
  "quality_score": 85,
  "ats_score": 78,
  "breakdown": {
    "formatting": 90,
    "keywords": 75,
    "experience_clarity": 88,
    "skill_relevance": 82
  },
  "suggestions": [...]
}
```

---

## Communication Patterns

### Synchronous Communication

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Service
    participant DB

    Client->>Gateway: HTTP Request + JWT
    Gateway->>Auth: ValidateToken (gRPC)
    Auth->>Auth: Verify JWT
    Auth-->>Gateway: UserInfo
    Gateway->>Service: Forward Request + User Context
    Service->>DB: Query/Mutation
    DB-->>Service: Result
    Service-->>Gateway: Response
    Gateway-->>Client: JSON Response
```

### Asynchronous Communication (Events)

```mermaid
sequenceDiagram
    participant AppService as Application Service
    participant RabbitMQ
    participant NotifService as Notification Service
    participant Email
    participant Push

    AppService->>RabbitMQ: Publish: application.status.changed
    RabbitMQ-->>NotifService: Consume Event
    NotifService->>NotifService: Process Notification Rules
    NotifService->>Email: Send Email
    NotifService->>Push: Send Push Notification
```

### gRPC Communication

| Consumer | Provider | Method | Purpose |
|----------|----------|--------|---------|
| Gateway | Auth | ValidateToken | JWT validation |
| User Service | Auth | ValidateToken | Auth check |
| Job Service | Auth | ValidateToken | Auth check |
| Application Service | Auth | ValidateToken | Auth check |
| Application Service | Job | FindOneJob | Get job details |
| Gateway | Auth | GetUserById | User lookup |

---

## Infrastructure Components

### PostgreSQL (Port 5432)

**Configuration:**
- Version: 15+
- Connection pooling: PgBouncer recommended
- Replication: Read replicas for scaling

**Key Features Used:**
- JSONB for flexible schema fields
- UUID for primary keys
- Partial indexes for performance
- Full-text search for basic queries

---

### Redis (Port 6379)

**Use Cases:**

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| Session storage | `session:{userId}` | 24h |
| JWT blacklist | `blacklist:{token}` | Token expiry |
| Rate limiting | `ratelimit:{ip}:{endpoint}` | 1min |
| Job cache | `cache:job:{jobId}` | 5min |
| Search cache | `cache:search:{hash}` | 10min |
| OTP storage | `otp:{email}` | 5min |

---

### Elasticsearch (Port 9200)

**Indices:**

| Index | Purpose | Refresh Interval |
|-------|---------|------------------|
| `jobs` | Job search & filtering | 1s |
| `profiles` | Candidate search (optional) | 5s |
| `analytics` | Event logs | 30s |

**Job Index Mapping:**
```json
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text", "analyzer": "standard" },
      "location": { "type": "keyword" },
      "city": { "type": "keyword" },
      "state": { "type": "keyword" },
      "jobType": { "type": "keyword" },
      "experienceLevel": { "type": "keyword" },
      "skills": { "type": "keyword" },
      "salaryMin": { "type": "integer" },
      "salaryMax": { "type": "integer" },
      "isActive": { "type": "boolean" },
      "createdAt": { "type": "date" }
    }
  }
}
```

---

### RabbitMQ (Port 5672)

**Exchanges:**

| Exchange | Type | Purpose |
|----------|------|---------|
| `notifications.topic` | topic | Notification routing |
| `analytics.direct` | direct | Analytics events |
| `jobs.fanout` | fanout | Job updates broadcast |

**Queues:**

| Queue | Exchange | Routing Key | Consumer |
|-------|----------|-------------|----------|
| `email.queue` | notifications.topic | notification.email.* | Notification Service |
| `sms.queue` | notifications.topic | notification.sms.* | Notification Service |
| `push.queue` | notifications.topic | notification.push.* | Notification Service |
| `whatsapp.queue` | notifications.topic | notification.whatsapp.* | Notification Service |
| `analytics.events` | analytics.direct | events | Analytics Service |

---

## Deployment Architecture

### Docker Compose (Development)

```yaml
version: '3.8'
services:
  # Infrastructure
  postgres:
    image: postgres:15
    ports: ["5432:5432"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

  elasticsearch:
    image: elasticsearch:8.11.0
    ports: ["9200:9200"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]

  # Core Services
  api-gateway:
    build: ./apps/api-gateway
    ports: ["3000:3000"]
    depends_on: [auth-service, user-service, job-service]

  auth-service:
    build: ./apps/auth-service
    ports: ["3001:3001", "50051:50051"]
    depends_on: [postgres, redis]

  user-service:
    build: ./apps/user-service
    ports: ["3002:3002"]
    depends_on: [postgres, auth-service]

  job-service:
    build: ./apps/job-service
    ports: ["3003:3003", "50052:50052"]
    depends_on: [postgres, elasticsearch, auth-service]

  application-service:
    build: ./apps/application-service
    ports: ["3004:3004"]
    depends_on: [postgres, rabbitmq, auth-service]
```

### Kubernetes (Production)

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            ING[Ingress Controller<br/>Nginx]
        end

        subgraph "Namespace: ai-job-core"
            GW_DEP[Gateway Deployment<br/>replicas: 3]
            AUTH_DEP[Auth Deployment<br/>replicas: 3]
            USER_DEP[User Deployment<br/>replicas: 2]
            JOB_DEP[Job Deployment<br/>replicas: 3]
            APP_DEP[Application Deployment<br/>replicas: 2]
        end

        subgraph "Namespace: ai-job-ai"
            RESUME_DEP[Resume Parser<br/>replicas: 2]
            RECOMMEND_DEP[Recommender<br/>replicas: 2]
            QUALITY_DEP[Quality Scorer<br/>replicas: 1]
        end

        subgraph "Namespace: ai-job-support"
            NOTIF_DEP[Notification<br/>replicas: 2]
            PAY_DEP[Payment<br/>replicas: 2]
            ANALYTICS_DEP[Analytics<br/>replicas: 2]
        end
    end

    subgraph "Managed Services"
        RDS[(RDS PostgreSQL)]
        ELASTICACHE[(ElastiCache Redis)]
        OPENSEARCH[(OpenSearch)]
        AMAZONMQ[Amazon MQ]
        S3_BUCKET[S3 Bucket]
    end

    ING --> GW_DEP
    GW_DEP --> AUTH_DEP
    GW_DEP --> USER_DEP
    GW_DEP --> JOB_DEP
    GW_DEP --> APP_DEP

    AUTH_DEP --> RDS
    AUTH_DEP --> ELASTICACHE
    USER_DEP --> RDS
    USER_DEP --> S3_BUCKET
    JOB_DEP --> RDS
    JOB_DEP --> OPENSEARCH
    APP_DEP --> RDS
    APP_DEP --> AMAZONMQ
```

---

## Data Flow Diagrams

### Job Search Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant Auth
    participant JobService
    participant Elasticsearch
    participant AI as AI Recommender
    participant Redis

    User->>Gateway: GET /jobs?q=engineer&location=NYC
    Gateway->>Auth: ValidateToken
    Auth-->>Gateway: Valid
    Gateway->>JobService: Search Request
    JobService->>Redis: Check Cache
    Redis-->>JobService: Cache Miss
    JobService->>Elasticsearch: Search Query
    Elasticsearch-->>JobService: Job Results
    JobService->>AI: Get Recommendations
    AI-->>JobService: Ranked Jobs
    JobService->>Redis: Store Cache (TTL: 5min)
    JobService-->>Gateway: Combined Results
    Gateway-->>User: JSON Response
```

### Application Submission Flow

```mermaid
sequenceDiagram
    participant Candidate
    participant Gateway
    participant AppService as Application Service
    participant JobService as Job Service
    participant DB as PostgreSQL
    participant Queue as RabbitMQ
    participant NotifService as Notification Service
    participant Employer

    Candidate->>Gateway: POST /applications
    Gateway->>AppService: Submit Application
    AppService->>JobService: Validate Job (gRPC)
    JobService-->>AppService: Job Valid
    AppService->>DB: Create Application
    DB-->>AppService: Application Created
    AppService->>Queue: Publish: application.submitted
    AppService-->>Gateway: Success Response
    Gateway-->>Candidate: Application Submitted

    Queue-->>NotifService: Consume Event
    NotifService->>Employer: Email: New Application
    NotifService->>Candidate: Email: Application Confirmation
```

### User Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant AuthService
    participant DB as PostgreSQL
    participant Redis
    participant Queue as RabbitMQ
    participant NotifService as Notification Service

    User->>Gateway: POST /auth/register
    Gateway->>AuthService: Register Request
    AuthService->>DB: Check Email Exists
    DB-->>AuthService: Not Found
    AuthService->>AuthService: Hash Password
    AuthService->>DB: Create User
    DB-->>AuthService: User Created
    AuthService->>AuthService: Generate Verification Token
    AuthService->>DB: Store Verification Token
    AuthService->>Queue: Publish: user.registered
    AuthService->>Redis: Store Session
    AuthService-->>Gateway: JWT + Refresh Token
    Gateway-->>User: Registration Success

    Queue-->>NotifService: Consume Event
    NotifService->>User: Email: Verify Your Email
```

---

## External Integrations

### Payment Gateways

| Provider | Region | Features |
|----------|--------|----------|
| Razorpay | India | UPI, Cards, Netbanking, Wallets |
| Stripe | International | Cards, ACH, SEPA |

### Communication Services

| Service | Purpose | Provider |
|---------|---------|----------|
| Email | Transactional emails | SendGrid |
| SMS | OTP, Alerts | Twilio |
| WhatsApp | Business messages | WhatsApp Business API |
| Push | Mobile notifications | Firebase Cloud Messaging |

### OAuth Providers

| Provider | Scopes |
|----------|--------|
| Google | email, profile |
| LinkedIn | r_emailaddress, r_liteprofile |

---

## Environment Variables

### Core Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | - |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `ELASTICSEARCH_URL` | ES connection | `http://localhost:9200` |
| `RABBITMQ_URL` | RabbitMQ connection | `amqp://localhost:5672` |

### Service URLs

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_SERVICE_URL` | Auth service | `http://localhost:3001` |
| `USER_SERVICE_URL` | User service | `http://localhost:3002` |
| `JOB_SERVICE_URL` | Job service | `http://localhost:3003` |
| `APPLICATION_SERVICE_URL` | Application service | `http://localhost:3004` |

### Security

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry (e.g., `1d`) |
| `REFRESH_TOKEN_SECRET` | Refresh token secret |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh expiry (e.g., `7d`) |
