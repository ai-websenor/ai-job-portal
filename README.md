# AI Job Portal - NestJS Microservices Architecture

> A comprehensive dual-sided job platform with AI-powered features, built using NestJS microservices architecture inside Turborepo monorepo.

## 🏗️ Architecture Overview

### Technology Stack

**Backend Framework**
- **NestJS 10+** with **Fastify** adapter for high performance
- **Turborepo** for monorepo management
- **TypeScript 5+** for type safety
- **Drizzle ORM** for PostgreSQL database

**Databases & Storage**
- **PostgreSQL 15** - Primary database
- **Redis 7** - Caching & session management
- **Elasticsearch 8** - Job search indexing
- **RabbitMQ** - Message queue for event-driven architecture

**AI/ML Services** (Python/FastAPI)
- Resume Parser (NER, LayoutLM)
- Job Recommender (Sentence Transformers)
- Quality Scorer (BERT)
- JD Generator (T5/BART)
- Skill Extractor (JobBERT)
- Chatbot (DialoGPT)

**DevOps**
- Docker & Docker Compose
- Kubernetes (production)
- GitHub Actions (CI/CD)
- Nginx (reverse proxy)

---

## 📁 Project Structure

```
ai-job-portal/
├── apps/                          # Microservices
│   ├── api-gateway/              # API Gateway (Port 3000)
│   ├── auth-service/             # Authentication (Port 3001)
│   ├── user-service/             # User Management (Port 3002)
│   ├── job-service/              # Job Management (Port 3003)
│   ├── application-service/      # Applications (Port 3004)
│   ├── notification-service/     # Notifications (Port 3005)
│   ├── payment-service/          # Payments (Port 3006)
│   ├── analytics-service/        # Analytics (Port 3007)
│   ├── messaging-service/        # Real-time Messaging (Port 3008)
│   ├── admin-service/            # Admin Panel (Port 3009)
│   └── ai-services/              # AI/ML Services (Python)
│       ├── resume-parser/        # Port 8001
│       ├── job-recommender/      # Port 8002
│       ├── quality-scorer/       # Port 8003
│       ├── chatbot/              # Port 8004
│       ├── jd-generator/         # Port 8005
│       └── skill-extractor/      # Port 8006
├── packages/                      # Shared packages
│   ├── common/                   # Utilities & constants
│   ├── database/                 # Database schemas (Drizzle ORM)
│   ├── types/                    # TypeScript types
│   └── config/                   # Shared configuration
├── docker/                        # Docker configurations
├── k8s/                          # Kubernetes manifests
└── DOCS/                         # Documentation
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+**
- **pnpm 8+**
- **Docker & Docker Compose**
- **PostgreSQL 15**
- **Redis 7**

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AI-Job-Portal
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Environment setup**
```bash
# Copy environment variables
cp .env.example .env

# Configure your environment variables
```

4. **Start infrastructure services**
```bash
# Start PostgreSQL, Redis, Elasticsearch, RabbitMQ
docker-compose up -d postgres redis elasticsearch rabbitmq
```

5. **Run database migrations**
```bash
pnpm db:push
```

6. **Start development servers**
```bash
# Start all microservices in development mode
pnpm dev
```

### Available Services

- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Auth Service**: http://localhost:3001
- **User Service**: http://localhost:3002
- **Job Service**: http://localhost:3003

---

## 🗄️ Database Architecture

### PostgreSQL Databases

**Main Database: `ai_job_portal`**

**Tables:**
- `users` - User accounts (job seekers, employers, admins)
- `job_seekers` - Job seeker profiles
- `work_experience` - Work history
- `education` - Educational background
- `employers` - Company/employer profiles
- `team_members` - Employer team members
- `jobs` - Job postings
- `screening_questions` - Job screening questions
- `job_categories` - Job categories
- `applications` - Job applications
- `interviews` - Interview scheduling
- `notifications` - User notifications
- `notification_preferences` - Notification settings
- `payments` - Payment transactions
- `subscriptions` - Subscription plans
- `invoices` - Invoice records

### Redis Usage

- **Session storage** - User sessions (key: `session:{userId}`)
- **Cache** - API response caching (TTL: 1 hour)
- **Job queues** - Background job processing
- **Rate limiting** - API rate limit tracking

### Elasticsearch Indexes

- **jobs_index** - Job postings search index
  - Full-text search on title, description
  - Filters: location, job type, salary, skills
  - Aggregations: categories, locations, companies

---

## 🔧 Microservices Details

### 1. API Gateway (Port 3000)
**Responsibilities:**
- Route traffic to microservices
- Authentication middleware
- Rate limiting & CORS
- Request/response transformation
- Circuit breaker pattern

**Key Features:**
- Fastify for high performance
- Global validation pipe
- Swagger API documentation
- Health check endpoints

### 2. Auth Service (Port 3001)
**Responsibilities:**
- User authentication (email/password, social login)
- JWT token generation & validation
- OTP verification (SMS/Email)
- Password reset workflow
- Session management
- Role-based access control (RBAC)

**Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/verify-otp` - OTP verification

### 3. User Service (Port 3002)
**Responsibilities:**
- Job seeker profile management
- Employer profile management
- Resume upload & management
- Work experience & education tracking
- Profile analytics

**Endpoints:**
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile
- `POST /users/resume` - Upload resume
- `GET /users/analytics` - Profile analytics

### 4. Job Service (Port 3003)
**Responsibilities:**
- Job posting CRUD operations
- Job search with Elasticsearch
- Job categorization
- Saved jobs & job alerts
- Job analytics

**Endpoints:**
- `POST /jobs` - Create job posting
- `GET /jobs` - Search jobs
- `GET /jobs/:id` - Get job details
- `PUT /jobs/:id` - Update job
- `DELETE /jobs/:id` - Delete job
- `POST /jobs/:id/save` - Save job

### 5. Application Service (Port 3004)
**Responsibilities:**
- Job application workflow
- Application status tracking
- Interview scheduling
- Screening questions handling

**Endpoints:**
- `POST /applications` - Submit application
- `GET /applications` - Get applications
- `PUT /applications/:id/status` - Update status
- `POST /applications/:id/interview` - Schedule interview

### 6. Notification Service (Port 3005)
**Responsibilities:**
- Multi-channel notifications (Email, SMS, WhatsApp, Push)
- Job alerts
- Application status updates
- Interview reminders
- Notification preferences

**Integrations:**
- SendGrid/AWS SES - Email
- Twilio/MSG91 - SMS
- WhatsApp Business API
- Firebase Cloud Messaging - Push

### 7. Payment Service (Port 3006)
**Responsibilities:**
- Payment processing (Razorpay, Stripe)
- Subscription management
- Invoice generation
- Refund processing

**Endpoints:**
- `POST /payments/create-order` - Create payment order
- `POST /payments/verify` - Verify payment
- `GET /payments/invoices` - Get invoices
- `POST /payments/refund` - Process refund

### 8. Analytics Service (Port 3007)
**Responsibilities:**
- User analytics
- Job analytics
- Revenue reports
- Real-time dashboards

**Endpoints:**
- `GET /analytics/users` - User metrics
- `GET /analytics/jobs` - Job metrics
- `GET /analytics/revenue` - Revenue reports

### 9. Messaging Service (Port 3008)
**Responsibilities:**
- Real-time chat (WebSocket)
- Message history
- Unread message tracking

**Technology:**
- Socket.io / WebSocket
- Redis Pub/Sub

### 10. Admin Service (Port 3009)
**Responsibilities:**
- Platform management
- User moderation
- Content management
- System settings

---

## 🤖 AI/ML Services (Python/FastAPI)

### 1. Resume Parser (Port 8001)
**Models:** LayoutLM + BERT NER
- Parse PDF/DOCX resumes
- Extract personal info, experience, education, skills
- Auto-fill profile fields

### 2. Job Recommender (Port 8002)
**Models:** Sentence Transformers
- Personalized job recommendations
- Semantic similarity matching
- Collaborative filtering

### 3. Quality Scorer (Port 8003)
**Models:** BERT Classifier
- Resume quality scoring
- ATS compatibility check
- Improvement suggestions

### 4. Chatbot (Port 8004)
**Models:** DialoGPT
- 24/7 user support
- FAQ automation
- Context-aware responses

### 5. JD Generator (Port 8005)
**Models:** T5/BART
- AI-powered job description generation
- Keyword optimization
- SEO enhancement

### 6. Skill Extractor (Port 8006)
**Models:** JobBERT
- Extract technical & soft skills
- Skill categorization
- Related skills suggestion

---

## 🔐 Security & Best Practices

### Authentication & Authorization
- JWT with refresh tokens
- OAuth 2.0 (Google, LinkedIn)
- Role-based access control (RBAC)
- Two-factor authentication (2FA)

### API Security
- Rate limiting (100 req/min)
- CORS configuration
- Helmet.js security headers
- Input validation (class-validator)
- SQL injection prevention (Drizzle ORM)

### Data Protection
- Password hashing (bcrypt)
- Data encryption (at rest & in transit)
- PCI-DSS compliance (payments)
- GDPR compliance

---

## 📊 Monitoring & Logging

### Logging
- Winston logger
- Structured JSON logs
- Log levels: error, warn, info, debug
- Centralized logging (ELK Stack)

### Monitoring
- Prometheus metrics
- Grafana dashboards
- Health check endpoints
- Performance tracking

### Alerting
- PagerDuty integration
- Slack notifications
- Email alerts

---

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
pnpm test:e2e
```

### Coverage
```bash
pnpm test:cov
```

---

## 🚢 Deployment

### Docker Deployment
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check pod status
kubectl get pods -n ai-job-portal
```

---

## 📝 Environment Variables

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

# Payment
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-secret

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

---

## 📚 API Documentation

### Swagger UI
- **Development**: http://localhost:3000/api/docs
- **Production**: https://api.yourdomain.com/api/docs

### Postman Collection
- Import `postman/ai-job-portal.postman_collection.json`

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Project Manager**: [Name]
- **Technical Lead**: [Name]
- **Backend Team**: [Names]
- **Frontend Team**: [Names]
- **DevOps Team**: [Names]

---

## 📞 Support

For questions or support:
- **Email**: support@ai-job-portal.com
- **Slack**: [Workspace Link]
- **Documentation**: [Wiki Link]

---

**Built with ❤️ using NestJS, Fastify, and Turborepo**
