# AI/ML Tools & Microservices Architecture

## Document Overview

This document provides comprehensive details about the AI/ML tools, models, and microservices architecture used in the AI Job Portal platform. All AI capabilities are implemented as independent Python-based microservices using Hugging Face models, with the main backend (NestJS/TypeScript) querying these services via REST APIs.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AI Microservices](#ai-microservices)
3. [Communication Flow](#communication-flow)
4. [Deployment Strategy](#deployment-strategy)
5. [API Specifications](#api-specifications)
6. [Performance & Scalability](#performance--scalability)
7. [Development Guidelines](#development-guidelines)
8. [Testing Strategy](#testing-strategy)
9. [Monitoring & Logging](#monitoring--logging)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                          │
│                   (React/Next.js - TypeScript)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ HTTPS/REST API
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                       Backend API Layer                          │
│                    (NestJS - TypeScript)                         │
│                                                                   │
│  - Business Logic                                                │
│  - Authentication & Authorization                                │
│  - Database Operations (PostgreSQL)                              │
│  - Cache Management (Redis)                                      │
│  - AI Service Orchestration                                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ HTTP REST APIs
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                   AI Microservices Layer                         │
│                     (Python/FastAPI)                             │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Resume Parser  │  │ Job Recommender │  │ Quality Scorer  │ │
│  │  (LayoutLM +    │  │   (Sentence     │  │     (BERT       │ │
│  │   BERT NER)     │  │  Transformers)  │  │  Classifier)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Chatbot      │  │  JD Generator   │  │ Skill Extractor │ │
│  │   (DialoGPT)    │  │  (Gen T5/BART)  │  │    (JobBERT)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**AI/ML Layer:**
- **Framework**: FastAPI (Python 3.10+)
- **ML Library**: PyTorch, Transformers (Hugging Face)
- **Model Storage**: Hugging Face Hub / Local storage
- **API**: REST APIs with JSON responses

**Backend Layer:**
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **HTTP Client**: Axios (HttpModule)
- **Cache**: Redis (for AI responses)
- **Validation**: class-validator, class-transformer

**Infrastructure:**
- **Containerization**: Docker
- **Orchestration**: Kubernetes (optional) / Docker Compose
- **API Gateway**: Kong / Nginx
- **Load Balancer**: Nginx / AWS ALB

---

## AI Microservices

### 1. Resume Parsing Service

**Purpose**: Parse uploaded resumes (PDF/DOCX) and extract structured data

**Model**: **LayoutLM + BERT NER**

**Hugging Face Models**:
- `microsoft/layoutlm-base-uncased` - Document layout understanding
- `dslim/bert-base-NER` - Named Entity Recognition for personal info, skills, experience

**Service Name**: `resume-parser-service`

**Port**: `8001`

**Capabilities**:
- Extract personal information (name, email, phone, address)
- Parse work experience (company, role, duration, description)
- Extract education (degree, institution, dates)
- Identify skills and certifications
- Extract languages
- Calculate profile completeness score

**Input**:
```json
{
  "file_url": "https://s3.amazonaws.com/bucket/resume.pdf",
  "file_type": "pdf",
  "user_id": "user_123"
}
```

**Output**:
```json
{
  "success": true,
  "data": {
    "personal_info": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1-555-0123",
      "location": "San Francisco, CA"
    },
    "work_experience": [
      {
        "company": "Tech Corp",
        "role": "Senior Software Engineer",
        "duration": "Jan 2020 - Present",
        "description": "Led development of microservices..."
      }
    ],
    "education": [
      {
        "degree": "B.S. Computer Science",
        "institution": "Stanford University",
        "year": "2019"
      }
    ],
    "skills": ["Python", "JavaScript", "React", "Node.js", "AWS"],
    "certifications": ["AWS Certified Solutions Architect"],
    "languages": ["English", "Spanish"],
    "completeness_score": 85
  },
  "processing_time_ms": 1250
}
```

**API Endpoints**:
- `POST /api/v1/parse` - Parse resume
- `GET /api/v1/health` - Health check
- `GET /api/v1/models` - List loaded models

**Dependencies**:
```txt
fastapi==0.104.1
uvicorn==0.24.0
transformers==4.35.2
torch==2.1.0
layoutlm==1.0.0
python-multipart==0.0.6
PyPDF2==3.0.1
python-docx==1.1.0
pillow==10.1.0
```

---

### 2. Job Recommendation Service

**Purpose**: Generate personalized job recommendations based on user profile and behavior

**Model**: **Sentence Transformers**

**Hugging Face Models**:
- `sentence-transformers/all-mpnet-base-v2` - Semantic similarity for job matching
- `sentence-transformers/paraphrase-MiniLM-L6-v2` - Fast lightweight alternative

**Service Name**: `job-recommender-service`

**Port**: `8002`

**Capabilities**:
- Semantic matching between user profile and job descriptions
- Skill-based recommendations
- Experience level matching
- Location and salary preference filtering
- Collaborative filtering based on user behavior
- Generate match scores (0-100)

**Input**:
```json
{
  "user_id": "user_123",
  "user_profile": {
    "skills": ["Python", "Machine Learning", "AWS"],
    "experience_years": 5,
    "job_preferences": {
      "job_type": "Full-time",
      "location": "Remote",
      "min_salary": 100000,
      "max_salary": 150000
    },
    "search_history": ["machine learning engineer", "data scientist"],
    "applied_jobs": ["job_456", "job_789"]
  },
  "available_jobs": [
    {
      "job_id": "job_001",
      "title": "Senior ML Engineer",
      "description": "We are looking for...",
      "skills_required": ["Python", "TensorFlow", "AWS"],
      "experience_required": "5-7 years",
      "location": "Remote",
      "salary_range": [120000, 140000]
    }
  ],
  "top_k": 10
}
```

**Output**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "job_id": "job_001",
        "match_score": 92,
        "match_reasons": [
          "Strong skill match (90%)",
          "Experience level aligned",
          "Salary within range",
          "Remote work preference matched"
        ],
        "skill_overlap": ["Python", "AWS"],
        "missing_skills": ["TensorFlow"]
      }
    ],
    "total_jobs_analyzed": 500,
    "processing_time_ms": 450
  }
}
```

**API Endpoints**:
- `POST /api/v1/recommend` - Get job recommendations
- `POST /api/v1/similarity` - Calculate similarity score
- `GET /api/v1/health` - Health check

**Dependencies**:
```txt
fastapi==0.104.1
uvicorn==0.24.0
sentence-transformers==2.2.2
transformers==4.35.2
torch==2.1.0
numpy==1.24.3
scikit-learn==1.3.2
```

---

### 3. Resume Quality Scoring Service

**Purpose**: Analyze resume quality and provide improvement suggestions

**Model**: **BERT Classifier**

**Hugging Face Models**:
- `bert-base-uncased` - Fine-tuned for resume quality classification
- Custom fine-tuned model on resume quality dataset

**Service Name**: `quality-scorer-service`

**Port**: `8003`

**Capabilities**:
- Overall quality score (0-100)
- ATS compatibility check
- Keyword density analysis
- Formatting and structure evaluation
- Grammar and readability scoring
- Actionable improvement suggestions

**Input**:
```json
{
  "resume_text": "Full text of the resume...",
  "job_description": "Optional job description for matching",
  "user_id": "user_123"
}
```

**Output**:
```json
{
  "success": true,
  "data": {
    "overall_score": 75,
    "breakdown": {
      "ats_compatibility": 85,
      "keyword_optimization": 70,
      "formatting": 80,
      "grammar_readability": 90,
      "content_quality": 65
    },
    "ats_check": {
      "passed": true,
      "issues": [
        "Tables detected - may not be ATS friendly"
      ]
    },
    "keyword_analysis": {
      "density_score": 70,
      "important_keywords_found": ["Python", "Leadership", "Agile"],
      "missing_keywords": ["Cloud Computing", "DevOps"]
    },
    "suggestions": [
      {
        "category": "Content",
        "priority": "High",
        "message": "Add quantifiable achievements with metrics"
      },
      {
        "category": "Keywords",
        "priority": "Medium",
        "message": "Include 'Cloud Computing' to match job requirements"
      },
      {
        "category": "Formatting",
        "priority": "Low",
        "message": "Consider using bullet points for better readability"
      }
    ],
    "processing_time_ms": 890
  }
}
```

**API Endpoints**:
- `POST /api/v1/score` - Score resume quality
- `POST /api/v1/analyze` - Detailed analysis
- `POST /api/v1/compare` - Compare with job description
- `GET /api/v1/health` - Health check

**Dependencies**:
```txt
fastapi==0.104.1
uvicorn==0.24.0
transformers==4.35.2
torch==2.1.0
nltk==3.8.1
textstat==0.7.3
language-tool-python==2.7.1
```

---

### 4. Chatbot Service

**Purpose**: AI-powered chatbot for user engagement and support

**Model**: **DialoGPT**

**Hugging Face Models**:
- `microsoft/DialoGPT-medium` - Conversational AI
- `microsoft/DialoGPT-large` - For production (higher quality)

**Service Name**: `chatbot-service`

**Port**: `8004`

**Capabilities**:
- Natural language conversations
- FAQ automation
- Job search assistance
- Application status queries
- Onboarding support
- Context-aware responses
- Multi-turn conversations

**Input**:
```json
{
  "user_id": "user_123",
  "message": "How do I apply for a job?",
  "conversation_id": "conv_456",
  "context": {
    "user_type": "job_seeker",
    "previous_messages": [
      {
        "role": "user",
        "content": "Hi, I need help"
      },
      {
        "role": "assistant",
        "content": "Hello! I'm here to help. What can I assist you with?"
      }
    ]
  }
}
```

**Output**:
```json
{
  "success": true,
  "data": {
    "response": "To apply for a job, first search for jobs that match your skills and interests. Click on a job listing to view details, then click the 'Apply Now' button. You can use Quick Apply if your profile is complete, or fill out a custom application with a cover letter.",
    "conversation_id": "conv_456",
    "intent": "job_application_help",
    "confidence": 0.92,
    "suggested_actions": [
      {
        "label": "Search Jobs",
        "action": "navigate",
        "url": "/jobs/search"
      },
      {
        "label": "View My Applications",
        "action": "navigate",
        "url": "/applications"
      }
    ],
    "processing_time_ms": 320
  }
}
```

**API Endpoints**:
- `POST /api/v1/chat` - Send message and get response
- `POST /api/v1/conversation/new` - Start new conversation
- `GET /api/v1/conversation/{id}` - Get conversation history
- `DELETE /api/v1/conversation/{id}` - Clear conversation
- `GET /api/v1/health` - Health check

**Dependencies**:
```txt
fastapi==0.104.1
uvicorn==0.24.0
transformers==4.35.2
torch==2.1.0
redis==5.0.1
```

---

### 5. Job Description Generator Service

**Purpose**: AI-assisted job description creation and optimization

**Model**: **T5 / BART**

**Hugging Face Models**:
- `google/flan-t5-base` - Text generation for JDs
- `facebook/bart-large-cnn` - Summarization and generation

**Service Name**: `jd-generator-service`

**Port**: `8005`

**Capabilities**:
- Generate complete job descriptions from title
- Suggest responsibilities and requirements
- Optimize existing JDs for keywords
- Generate multiple variations
- Industry-specific templates
- SEO optimization

**Input**:
```json
{
  "job_title": "Senior Full Stack Developer",
  "company_info": {
    "name": "TechCorp",
    "industry": "Technology",
    "size": "50-200 employees"
  },
  "requirements": {
    "experience_years": 5,
    "skills": ["React", "Node.js", "PostgreSQL"],
    "education": "Bachelor's degree in Computer Science"
  },
  "job_type": "Full-time",
  "location": "Remote",
  "salary_range": [100000, 130000],
  "mode": "generate",
  "num_variations": 1
}
```

**Output**:
```json
{
  "success": true,
  "data": {
    "job_description": {
      "title": "Senior Full Stack Developer",
      "summary": "Join TechCorp as a Senior Full Stack Developer to build scalable web applications...",
      "responsibilities": [
        "Design and develop full-stack web applications using React and Node.js",
        "Architect scalable backend services with PostgreSQL",
        "Collaborate with cross-functional teams to define technical requirements",
        "Mentor junior developers and conduct code reviews"
      ],
      "requirements": [
        "5+ years of experience in full-stack development",
        "Expert knowledge of React, Node.js, and PostgreSQL",
        "Bachelor's degree in Computer Science or related field",
        "Strong problem-solving and communication skills"
      ],
      "nice_to_have": [
        "Experience with AWS or cloud platforms",
        "Knowledge of Docker and Kubernetes",
        "Contributions to open-source projects"
      ],
      "benefits": [
        "Competitive salary ($100,000 - $130,000)",
        "Remote work flexibility",
        "Health insurance and 401(k) matching",
        "Professional development opportunities"
      ]
    },
    "seo_keywords": ["full stack developer", "react developer", "node.js", "remote job"],
    "readability_score": 85,
    "variations": [],
    "processing_time_ms": 1100
  }
}
```

**API Endpoints**:
- `POST /api/v1/generate` - Generate job description
- `POST /api/v1/optimize` - Optimize existing JD
- `POST /api/v1/suggest` - Get suggestions for improvement
- `POST /api/v1/templates` - Get industry templates
- `GET /api/v1/health` - Health check

**Dependencies**:
```txt
fastapi==0.104.1
uvicorn==0.24.0
transformers==4.35.2
torch==2.1.0
nltk==3.8.1
textstat==0.7.3
```

---

### 6. Skill Extraction Service

**Purpose**: Extract and categorize skills from text (resumes, job descriptions)

**Model**: **JobBERT**

**Hugging Face Models**:
- `jjzha/jobbert-base-cased` - Job domain-specific BERT
- `jjzha/jobbert_skill_extraction` - Fine-tuned for skill extraction

**Service Name**: `skill-extractor-service`

**Port**: `8006`

**Capabilities**:
- Extract technical and soft skills
- Categorize skills (programming, tools, frameworks, soft skills)
- Skill level inference (beginner, intermediate, expert)
- Related skills suggestion
- Skill gap analysis
- Industry-specific skill mapping

**Input**:
```json
{
  "text": "Experienced in Python, JavaScript, React, and AWS. Strong leadership and communication skills. Proficient in Agile methodologies.",
  "source_type": "resume",
  "industry": "Technology"
}
```

**Output**:
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skill": "Python",
        "category": "Programming Language",
        "confidence": 0.98,
        "level": "experienced",
        "related_skills": ["Django", "Flask", "FastAPI"]
      },
      {
        "skill": "JavaScript",
        "category": "Programming Language",
        "confidence": 0.97,
        "level": "experienced"
      },
      {
        "skill": "React",
        "category": "Framework",
        "confidence": 0.96,
        "level": "intermediate"
      },
      {
        "skill": "AWS",
        "category": "Cloud Platform",
        "confidence": 0.95,
        "level": "intermediate"
      },
      {
        "skill": "Leadership",
        "category": "Soft Skill",
        "confidence": 0.90,
        "level": "strong"
      },
      {
        "skill": "Communication",
        "category": "Soft Skill",
        "confidence": 0.89,
        "level": "strong"
      },
      {
        "skill": "Agile",
        "category": "Methodology",
        "confidence": 0.93,
        "level": "proficient"
      }
    ],
    "skill_summary": {
      "total_skills": 7,
      "technical_skills": 4,
      "soft_skills": 2,
      "methodologies": 1
    },
    "processing_time_ms": 280
  }
}
```

**API Endpoints**:
- `POST /api/v1/extract` - Extract skills from text
- `POST /api/v1/categorize` - Categorize extracted skills
- `POST /api/v1/suggest` - Suggest related skills
- `POST /api/v1/gap-analysis` - Analyze skill gaps
- `GET /api/v1/health` - Health check

**Dependencies**:
```txt
fastapi==0.104.1
uvicorn==0.24.0
transformers==4.35.2
torch==2.1.0
spacy==3.7.2
```

---

## Communication Flow

### Request Flow Diagram

```
User Action (Frontend)
    ↓
Frontend sends request to Backend API
    ↓
Backend validates request & checks authentication
    ↓
Backend checks Redis cache for existing result
    ↓
If cache miss:
    Backend sends HTTP request to AI Microservice
    ↓
    AI Microservice processes with ML model
    ↓
    AI Microservice returns JSON response
    ↓
Backend caches response in Redis (TTL: 1 hour)
    ↓
Backend formats and enriches response
    ↓
Backend returns to Frontend
    ↓
Frontend displays results to User
```

### Backend Integration (NestJS/TypeScript)

**Example: Resume Parser Service**

```typescript
// src/ai-services/resume-parser/resume-parser.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { firstValueFrom } from 'rxjs';
import { ParseResumeDto, ParsedResumeData } from './dto/resume-parser.dto';

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.baseURL = this.configService.get<string>(
      'RESUME_PARSER_SERVICE_URL',
      'http://localhost:8001',
    );
    this.timeout = 30000; // 30 seconds
    this.serviceKey = this.configService.get<string>('AI_SERVICE_KEY');
  }

  /**
   * Parse resume and extract structured data
   * @param parseDto - { file_url, file_type, user_id }
   * @returns Parsed resume data
   */
  async parseResume(parseDto: ParseResumeDto): Promise<ParsedResumeData> {
    try {
      // Check cache first
      const cacheKey = `resume:parsed:${parseDto.user_id}:${parseDto.file_url}`;
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        this.logger.log('Resume data found in cache');
        return JSON.parse(cached);
      }

      // Call AI service
      this.logger.log(`Calling resume parser service for user: ${parseDto.user_id}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseURL}/api/v1/parse`, parseDto, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': this.serviceKey,
          },
          timeout: this.timeout,
        }),
      );

      if (response.data.success) {
        // Cache the result for 1 hour (3600 seconds)
        await this.redisService.setex(
          cacheKey,
          3600,
          JSON.stringify(response.data.data),
        );

        this.logger.log(
          `Resume parsed successfully for user: ${parseDto.user_id}, processing time: ${response.data.processing_time_ms}ms`,
        );

        return response.data.data;
      } else {
        throw new HttpException(
          'Resume parsing failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error(
        `Resume parser error for user ${parseDto.user_id}: ${error.message}`,
        error.stack,
      );

      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Resume parser service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw error;
    }
  }

  /**
   * Health check for resume parser service
   * @returns boolean indicating service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseURL}/api/v1/health`, {
          timeout: 5000,
        }),
      );
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error(
        `Resume parser health check failed: ${error.message}`,
      );
      return false;
    }
  }
}
```

**Example: Job Recommender Service**

```typescript
// src/ai-services/job-recommender/job-recommender.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { firstValueFrom } from 'rxjs';
import {
  GetRecommendationsDto,
  RecommendationsResponse,
  CalculateSimilarityDto,
} from './dto/job-recommender.dto';

@Injectable()
export class JobRecommenderService {
  private readonly logger = new Logger(JobRecommenderService.name);
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.baseURL = this.configService.get<string>(
      'JOB_RECOMMENDER_SERVICE_URL',
      'http://localhost:8002',
    );
    this.timeout = 10000; // 10 seconds
    this.serviceKey = this.configService.get<string>('AI_SERVICE_KEY');
  }

  /**
   * Get job recommendations for user
   * @param dto - User profile and available jobs
   * @returns Recommended jobs with match scores
   */
  async getRecommendations(
    dto: GetRecommendationsDto,
  ): Promise<RecommendationsResponse> {
    try {
      const cacheKey = `recommendations:${dto.user_id}:${Math.floor(Date.now() / 3600000)}`;
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        this.logger.log('Recommendations found in cache');
        return JSON.parse(cached);
      }

      this.logger.log(`Calling job recommender service for user: ${dto.user_id}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseURL}/api/v1/recommend`, dto, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': this.serviceKey,
          },
          timeout: this.timeout,
        }),
      );

      if (response.data.success) {
        // Cache for 1 hour
        await this.redisService.setex(
          cacheKey,
          3600,
          JSON.stringify(response.data.data),
        );

        this.logger.log(
          `Recommendations generated for user: ${dto.user_id}, count: ${response.data.data.recommendations.length}`,
        );

        return response.data.data;
      } else {
        throw new HttpException(
          'Recommendation generation failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error(
        `Job recommender error for user ${dto.user_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate similarity score between user and job
   * @param dto - { user_profile, job_description }
   * @returns Similarity score (0-100)
   */
  async calculateSimilarity(dto: CalculateSimilarityDto): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseURL}/api/v1/similarity`, dto, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': this.serviceKey,
          },
          timeout: this.timeout,
        }),
      );
      return response.data.data.similarity_score;
    } catch (error) {
      this.logger.error(
        `Similarity calculation error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
```

**Example: DTOs (Data Transfer Objects)**

```typescript
// src/ai-services/resume-parser/dto/resume-parser.dto.ts
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParseResumeDto {
  @ApiProperty({ example: 'https://s3.amazonaws.com/bucket/resume.pdf' })
  @IsUrl()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({ example: 'pdf', enum: ['pdf', 'docx', 'doc'] })
  @IsString()
  @IsNotEmpty()
  file_type: string;

  @ApiProperty({ example: 'user_123' })
  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export class ParsedResumeData {
  personal_info: PersonalInfo;
  work_experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  languages: string[];
  completeness_score: number;
}
```

**Example: Controller**

```typescript
// src/resume/resume.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeService } from './resume.service';
import { ResumeParserService } from '../ai-services/resume-parser/resume-parser.service';
import { UploadResumeDto } from './dto/upload-resume.dto';

@ApiTags('Resume')
@Controller('resume')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly resumeParserService: ResumeParserService,
  ) {}

  @Post('upload-and-parse')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload and parse resume' })
  async uploadAndParseResume(
    @Body() uploadDto: UploadResumeDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;

      // Call AI service to parse resume
      const parsedData = await this.resumeParserService.parseResume({
        file_url: uploadDto.file_url,
        file_type: uploadDto.file_type,
        user_id: userId,
      });

      // Save parsed data to database using resume service
      const resume = await this.resumeService.createResume({
        userId,
        fileUrl: uploadDto.file_url,
        fileType: uploadDto.file_type,
        personalInfo: parsedData.personal_info,
        workExperience: parsedData.work_experience,
        education: parsedData.education,
        skills: parsedData.skills,
        certifications: parsedData.certifications,
        languages: parsedData.languages,
        completenessScore: parsedData.completeness_score,
      });

      // Update user profile with parsed info
      await this.resumeService.updateUserProfileFromResume(
        userId,
        parsedData.personal_info,
      );

      return {
        success: true,
        message: 'Resume parsed successfully',
        data: {
          resume_id: resume.id,
          parsed_data: parsedData,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to parse resume',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

**Example: Module Setup**

```typescript
// src/ai-services/ai-services.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ResumeParserService } from './resume-parser/resume-parser.service';
import { JobRecommenderService } from './job-recommender/job-recommender.service';
import { QualityScorerService } from './quality-scorer/quality-scorer.service';
import { ChatbotService } from './chatbot/chatbot.service';
import { JdGeneratorService } from './jd-generator/jd-generator.service';
import { SkillExtractorService } from './skill-extractor/skill-extractor.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    RedisModule,
  ],
  providers: [
    ResumeParserService,
    JobRecommenderService,
    QualityScorerService,
    ChatbotService,
    JdGeneratorService,
    SkillExtractorService,
  ],
  exports: [
    ResumeParserService,
    JobRecommenderService,
    QualityScorerService,
    ChatbotService,
    JdGeneratorService,
    SkillExtractorService,
  ],
})
export class AiServicesModule {}
```

---

## Deployment Strategy

### Docker Compose Setup (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Backend API
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - RESUME_PARSER_SERVICE_URL=http://resume-parser:8001
      - JOB_RECOMMENDER_SERVICE_URL=http://job-recommender:8002
      - QUALITY_SCORER_SERVICE_URL=http://quality-scorer:8003
      - CHATBOT_SERVICE_URL=http://chatbot:8004
      - JD_GENERATOR_SERVICE_URL=http://jd-generator:8005
      - SKILL_EXTRACTOR_SERVICE_URL=http://skill-extractor:8006
    depends_on:
      - resume-parser
      - job-recommender
      - quality-scorer
      - chatbot
      - jd-generator
      - skill-extractor
      - redis
      - postgres

  # Resume Parser Service
  resume-parser:
    build: ./ai-services/resume-parser
    ports:
      - "8001:8001"
    volumes:
      - ./ai-services/resume-parser/models:/app/models
    environment:
      - MODEL_CACHE_DIR=/app/models
      - MAX_WORKERS=2
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  # Job Recommender Service
  job-recommender:
    build: ./ai-services/job-recommender
    ports:
      - "8002:8002"
    volumes:
      - ./ai-services/job-recommender/models:/app/models
    environment:
      - MODEL_CACHE_DIR=/app/models
      - MAX_WORKERS=4
    deploy:
      resources:
        limits:
          memory: 3G
        reservations:
          memory: 1.5G

  # Quality Scorer Service
  quality-scorer:
    build: ./ai-services/quality-scorer
    ports:
      - "8003:8003"
    volumes:
      - ./ai-services/quality-scorer/models:/app/models
    environment:
      - MODEL_CACHE_DIR=/app/models
      - MAX_WORKERS=3
    deploy:
      resources:
        limits:
          memory: 3G
        reservations:
          memory: 1.5G

  # Chatbot Service
  chatbot:
    build: ./ai-services/chatbot
    ports:
      - "8004:8004"
    volumes:
      - ./ai-services/chatbot/models:/app/models
    environment:
      - MODEL_CACHE_DIR=/app/models
      - REDIS_URL=redis://redis:6379
      - MAX_WORKERS=3
    depends_on:
      - redis
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  # JD Generator Service
  jd-generator:
    build: ./ai-services/jd-generator
    ports:
      - "8005:8005"
    volumes:
      - ./ai-services/jd-generator/models:/app/models
    environment:
      - MODEL_CACHE_DIR=/app/models
      - MAX_WORKERS=2
    deploy:
      resources:
        limits:
          memory: 5G
        reservations:
          memory: 3G

  # Skill Extractor Service
  skill-extractor:
    build: ./ai-services/skill-extractor
    ports:
      - "8006:8006"
    volumes:
      - ./ai-services/skill-extractor/models:/app/models
    environment:
      - MODEL_CACHE_DIR=/app/models
      - MAX_WORKERS=4
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=ai_job_portal
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

### Kubernetes Deployment (Production)

```yaml
# kubernetes/ai-services/resume-parser-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resume-parser
  namespace: ai-services
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resume-parser
  template:
    metadata:
      labels:
        app: resume-parser
    spec:
      containers:
      - name: resume-parser
        image: your-registry/resume-parser:latest
        ports:
        - containerPort: 8001
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        env:
        - name: MODEL_CACHE_DIR
          value: "/app/models"
        - name: MAX_WORKERS
          value: "2"
        volumeMounts:
        - name: model-cache
          mountPath: /app/models
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8001
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: resume-parser-models-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: resume-parser
  namespace: ai-services
spec:
  selector:
    app: resume-parser
  ports:
  - protocol: TCP
    port: 8001
    targetPort: 8001
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: resume-parser-hpa
  namespace: ai-services
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: resume-parser
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

---

## API Specifications

### Common Request/Response Format

**Request Headers**:
```
Content-Type: application/json
X-Service-Key: <api-key>
X-Request-ID: <unique-request-id>
```

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "processing_time_ms": 500
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "File URL is required",
    "details": {}
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Invalid request parameters |
| `MODEL_ERROR` | ML model processing error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `AUTHENTICATION_FAILED` | Invalid API key |
| `TIMEOUT` | Request processing timeout |

---

## Performance & Scalability

### Performance Targets

| Service | Target Response Time (p95) | Max Throughput |
|---------|---------------------------|----------------|
| Resume Parser | < 2s | 100 req/min |
| Job Recommender | < 500ms | 500 req/min |
| Quality Scorer | < 1s | 200 req/min |
| Chatbot | < 300ms | 1000 req/min |
| JD Generator | < 1.5s | 150 req/min |
| Skill Extractor | < 300ms | 500 req/min |

### Optimization Strategies

**1. Model Optimization**:
- Use quantized models (INT8) for faster inference
- ONNX runtime for production
- Model distillation for smaller models
- GPU acceleration where applicable

**2. Caching Strategy**:
- Redis cache for frequently requested results
- TTL-based cache invalidation
- Cache warming for popular requests
- Distributed caching for scalability

**3. Load Balancing**:
- Round-robin load balancing
- Sticky sessions for chatbot conversations
- Health check-based routing
- Auto-scaling based on metrics

**4. Batch Processing**:
- Batch inference for similar requests
- Queue-based processing for non-urgent tasks
- Asynchronous processing with webhooks

---

## Development Guidelines

### Project Structure (AI Microservice - NestJS)

```
ai-services/
├── resume-parser/
│   ├── src/
│   │   ├── main.ts                      # NestJS bootstrap
│   │   ├── app.module.ts                # Root module
│   │   ├── config/
│   │   │   └── configuration.ts         # Configuration
│   │   ├── ml-models/
│   │   │   ├── ml-models.module.ts      # ML Models module
│   │   │   └── ml-models.service.ts     # Transformers.js model loading
│   │   ├── parser/
│   │   │   ├── parser.module.ts         # Parser module
│   │   │   ├── parser.controller.ts     # API controller
│   │   │   ├── parser.service.ts        # Business logic
│   │   │   └── dto/
│   │   │       ├── parse-resume.dto.ts  # Request DTOs
│   │   │       └── parsed-data.dto.ts   # Response DTOs
│   │   ├── common/
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   └── logging.interceptor.ts
│   │   │   └── guards/
│   │   │       └── api-key.guard.ts
│   │   └── health/
│   │       ├── health.module.ts
│   │       └── health.controller.ts
│   ├── models/                          # Model cache directory
│   ├── test/
│   │   ├── app.e2e-spec.ts
│   │   └── parser.service.spec.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env.example
│   └── README.md
```

### NestJS + Transformers.js Template

**Package.json Dependencies:**

```json
{
  "name": "resume-parser-service",
  "version": "1.0.0",
  "description": "AI Resume Parser Microservice",
  "main": "dist/main.js",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/swagger": "^7.2.0",
    "@xenova/transformers": "^2.17.0",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "axios": "^1.6.5",
    "winston": "^3.11.0",
    "nest-winston": "^1.9.4",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/jest": "^29.5.11",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "jest": "^29.7.0",
    "prettier": "^3.2.4",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.1",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.3.3"
  }
}
```

**Main Bootstrap File:**

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Configure Winston logger
  const winstonLogger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.json(),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.json(),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Resume Parser Service')
    .setDescription('AI-powered resume parsing microservice API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-Service-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8001;
  await app.listen(port);

  logger.log(`🚀 Resume Parser Service running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
```

**App Module:**

```typescript
// src/app.module.ts
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { MlModelsModule } from './ml-models/ml-models.module';
import { ParserModule } from './parser/parser.module';
import { HealthModule } from './health/health.module';
import { MlModelsService } from './ml-models/ml-models.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MlModelsModule,
    ParserModule,
    HealthModule,
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly mlModelsService: MlModelsService) {}

  async onModuleInit() {
    this.logger.log('Loading Hugging Face models...');
    await this.mlModelsService.loadModels();
    this.logger.log('✅ Models loaded successfully');
  }
}
```

**ML Models Module & Service:**

```typescript
// src/ml-models/ml-models.module.ts
import { Module, Global } from '@nestjs/common';
import { MlModelsService } from './ml-models.service';

@Global()
@Module({
  providers: [MlModelsService],
  exports: [MlModelsService],
})
export class MlModelsModule {}
```

```typescript
// src/ml-models/ml-models.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pipeline, Pipeline, env } from '@xenova/transformers';
import * as path from 'path';

// Configure Transformers.js
env.allowLocalModels = true;

@Injectable()
export class MlModelsService {
  private readonly logger = new Logger(MlModelsService.name);
  private nerPipeline: Pipeline | null = null;
  private loaded: boolean = false;

  constructor(private configService: ConfigService) {
    // Configure model cache directory
    const cacheDir = this.configService.get<string>('modelCacheDir', './models');
    env.cacheDir = path.resolve(cacheDir);
  }

  /**
   * Load all required Hugging Face models
   */
  async loadModels(): Promise<void> {
    if (this.loaded) {
      this.logger.log('Models already loaded');
      return;
    }

    try {
      this.logger.log('Loading NER model for resume parsing...');

      const nerModel = this.configService.get<string>('nerModel', 'Xenova/bert-base-NER');

      // Load Named Entity Recognition model
      this.nerPipeline = await pipeline(
        'token-classification',
        nerModel,
        { quantized: true }
      );

      this.loaded = true;
      this.logger.log('All models loaded successfully');
    } catch (error) {
      this.logger.error('Error loading models:', error);
      throw error;
    }
  }

  /**
   * Extract named entities from text
   */
  async extractEntities(text: string): Promise<any[]> {
    if (!this.nerPipeline) {
      throw new Error('NER model not loaded');
    }

    try {
      const results = await this.nerPipeline(text);
      return results;
    } catch (error) {
      this.logger.error('Error extracting entities:', error);
      throw error;
    }
  }

  /**
   * Check if models are loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}
```

**Parser Module:**

```typescript
// src/parser/parser.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ParserController } from './parser.controller';
import { ParserService } from './parser.service';

@Module({
  imports: [HttpModule],
  controllers: [ParserController],
  providers: [ParserService],
})
export class ParserModule {}
```

**Parser DTOs:**

```typescript
// src/parser/dto/parse-resume.dto.ts
import { IsString, IsNotEmpty, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FileType {
  PDF = 'pdf',
  DOCX = 'docx',
  DOC = 'doc',
}

export class ParseResumeDto {
  @ApiProperty({ example: 'https://s3.amazonaws.com/bucket/resume.pdf' })
  @IsUrl()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({ example: 'pdf', enum: FileType })
  @IsEnum(FileType)
  @IsNotEmpty()
  file_type: FileType;

  @ApiProperty({ example: 'user_123' })
  @IsString()
  @IsNotEmpty()
  user_id: string;
}
```

**Parser Service:**

```typescript
// src/parser/parser.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MlModelsService } from '../ml-models/ml-models.service';
import { firstValueFrom } from 'rxjs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { ParseResumeDto } from './dto/parse-resume.dto';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    private readonly mlModelsService: MlModelsService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Parse resume from file URL
   */
  async parseResume(dto: ParseResumeDto): Promise<any> {
    try {
      // Download file
      const fileBuffer = await this.downloadFile(dto.file_url);

      // Extract text based on file type
      let text: string;
      if (dto.file_type === 'pdf') {
        text = await this.extractTextFromPDF(fileBuffer);
      } else if (dto.file_type === 'docx' || dto.file_type === 'doc') {
        text = await this.extractTextFromDocx(fileBuffer);
      } else {
        throw new HttpException(
          `Unsupported file type: ${dto.file_type}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract entities using NER model
      const entities = await this.mlModelsService.extractEntities(text);

      // Parse structured data
      const parsedData = await this.extractStructuredData(text, entities);

      return parsedData;
    } catch (error) {
      this.logger.error('Error parsing resume:', error);
      throw new HttpException(
        'Failed to parse resume',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { responseType: 'arraybuffer' }),
      );
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download file from ${url}:`, error);
      throw new HttpException(
        'Failed to download file',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * Extract text from DOCX
   */
  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Extract structured data from text and entities
   */
  private async extractStructuredData(text: string, entities: any[]): Promise<any> {
    // Extract personal information
    const personalInfo = this.extractPersonalInfo(text, entities);

    // Extract work experience
    const workExperience = this.extractWorkExperience(text);

    // Extract education
    const education = this.extractEducation(text);

    // Extract skills
    const skills = this.extractSkills(text, entities);

    // Calculate completeness score
    const completenessScore = this.calculateCompletenessScore({
      personalInfo,
      workExperience,
      education,
      skills,
    });

    return {
      personal_info: personalInfo,
      work_experience: workExperience,
      education: education,
      skills: skills,
      certifications: [],
      languages: [],
      completeness_score: completenessScore,
    };
  }

  /**
   * Extract personal information using regex and NER
   */
  private extractPersonalInfo(text: string, entities: any[]): any {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

    const email = text.match(emailRegex)?.[0] || '';
    const phone = text.match(phoneRegex)?.[0] || '';

    // Extract name from entities (PER - Person)
    const nameEntity = entities.find(e => e.entity === 'B-PER' || e.entity === 'I-PER');
    const name = nameEntity?.word || '';

    return {
      name,
      email,
      phone,
      location: '',
    };
  }

  /**
   * Extract work experience sections
   */
  private extractWorkExperience(text: string): any[] {
    // Simplified extraction - in production, use more sophisticated NLP
    const experiences: any[] = [];

    // Look for common patterns in resumes
    const expSection = text.match(/(?:experience|employment)([\s\S]*?)(?:education|skills|$)/i);

    if (expSection && expSection[1]) {
      // Parse experience entries
      const lines = expSection[1].split('\n').filter(line => line.trim());

      // Group related lines into experience objects
      // This is a simplified version - enhance based on requirements
      if (lines.length > 0) {
        experiences.push({
          company: lines[0] || '',
          role: lines[1] || '',
          duration: '',
          description: lines.slice(2).join(' '),
        });
      }
    }

    return experiences;
  }

  /**
   * Extract education information
   */
  private extractEducation(text: string): any[] {
    const education: any[] = [];

    const eduSection = text.match(/(?:education)([\s\S]*?)(?:experience|skills|$)/i);

    if (eduSection && eduSection[1]) {
      const lines = eduSection[1].split('\n').filter(line => line.trim());

      if (lines.length > 0) {
        education.push({
          degree: lines[0] || '',
          institution: lines[1] || '',
          year: '',
        });
      }
    }

    return education;
  }

  /**
   * Extract skills from text
   */
  private extractSkills(text: string, entities: any[]): string[] {
    const skills: string[] = [];

    // Common tech skills keywords
    const skillKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Node.js',
      'Angular', 'Vue', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Git', 'CI/CD',
    ];

    skillKeywords.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    });

    return [...new Set(skills)]; // Remove duplicates
  }

  /**
   * Calculate resume completeness score
   */
  private calculateCompletenessScore(data: any): number {
    let score = 0;

    if (data.personalInfo?.name) score += 20;
    if (data.personalInfo?.email) score += 20;
    if (data.personalInfo?.phone) score += 10;
    if (data.workExperience?.length > 0) score += 25;
    if (data.education?.length > 0) score += 15;
    if (data.skills?.length > 0) score += 10;

    return Math.min(score, 100);
  }
}
```

**Parser Controller:**

```typescript
// src/parser/parser.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { ParserService } from './parser.service';
import { ParseResumeDto } from './dto/parse-resume.dto';

@ApiTags('Parser')
@Controller('api/v1')
@ApiSecurity('api-key')
export class ParserController {
  constructor(private readonly parserService: ParserService) {}

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse resume from file URL' })
  @ApiResponse({
    status: 200,
    description: 'Resume parsed successfully',
    schema: {
      example: {
        success: true,
        data: {
          personal_info: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1-555-0123',
            location: 'San Francisco, CA',
          },
          work_experience: [],
          education: [],
          skills: ['JavaScript', 'TypeScript', 'React'],
          certifications: [],
          languages: [],
          completeness_score: 85,
        },
        processing_time_ms: 1250,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async parseResume(@Body() parseResumeDto: ParseResumeDto) {
    const startTime = Date.now();

    const parsedData = await this.parserService.parseResume(parseResumeDto);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      data: parsedData,
      processing_time_ms: processingTime,
    };
  }
}
```

**Health Module & Controller:**

```typescript
// src/health/health.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MlModelsService } from '../ml-models/ml-models.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly mlModelsService: MlModelsService) {}

  @Get('api/v1/health')
  @ApiOperation({ summary: 'Health check endpoint' })
  healthCheck() {
    return {
      status: 'healthy',
      service: 'resume-parser',
      version: '1.0.0',
      models_loaded: this.mlModelsService.isLoaded(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  root() {
    return {
      message: 'Resume Parser Service API',
      version: '1.0.0',
      documentation: '/api/docs',
    };
  }
}
```

**API Key Guard (Optional):**

```typescript
// src/common/guards/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-service-key'];
    const validApiKey = this.configService.get<string>('apiKey');

    if (!validApiKey || apiKey === validApiKey) {
      return true;
    }

    throw new UnauthorizedException('Invalid API key');
  }
}
```

### Environment Configuration

**.env.example:**

```env
# Service settings
NODE_ENV=development
PORT=8001
SERVICE_NAME=resume-parser

# Model settings
MODEL_CACHE_DIR=./models
NER_MODEL=Xenova/bert-base-NER

# API settings
API_KEY=your-secret-api-key
RATE_LIMIT=100

# Performance settings
REQUEST_TIMEOUT=30000
```

**Config TypeScript:**

```typescript
// src/config/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Service settings
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8001', 10),
  serviceName: process.env.SERVICE_NAME || 'resume-parser',

  // Model settings
  modelCacheDir: process.env.MODEL_CACHE_DIR || './models',
  nerModel: process.env.NER_MODEL || 'Xenova/bert-base-NER',

  // API settings
  apiKey: process.env.API_KEY || '',
  rateLimit: parseInt(process.env.RATE_LIMIT || '100', 10),

  // Performance settings
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
};
```

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**nest-cli.json:**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

**Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create models directory
RUN mkdir -p /app/models

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8001/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start service
CMD ["node", "dist/index.js"]
```

---

## Testing Strategy

### Unit Tests (Jest)

**jest.config.js:**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Unit Tests:**

```typescript
// tests/parser.test.ts
import { ResumeParserService } from '../src/services/parser.service';
import { ModelManager } from '../src/models/ml-models';

describe('ResumeParserService', () => {
  let parserService: ResumeParserService;
  let modelManager: ModelManager;

  beforeAll(async () => {
    modelManager = new ModelManager();
    await modelManager.loadModels();
    parserService = new ResumeParserService(modelManager);
  });

  describe('extractPersonalInfo', () => {
    it('should extract email from text', () => {
      const text = 'Contact me at john.doe@example.com';
      const result = parserService['extractPersonalInfo'](text, []);

      expect(result.email).toBe('john.doe@example.com');
    });

    it('should extract phone from text', () => {
      const text = 'Phone: +1-555-0123';
      const result = parserService['extractPersonalInfo'](text, []);

      expect(result.phone).toBe('+1-555-0123');
    });
  });

  describe('extractSkills', () => {
    it('should extract tech skills from text', () => {
      const text = 'I have experience with JavaScript, TypeScript, React, and Node.js';
      const skills = parserService['extractSkills'](text, []);

      expect(skills).toContain('JavaScript');
      expect(skills).toContain('TypeScript');
      expect(skills).toContain('React');
      expect(skills).toContain('Node.js');
    });
  });

  describe('calculateCompletenessScore', () => {
    it('should return 100 for complete resume', () => {
      const data = {
        personalInfo: { name: 'John Doe', email: 'john@example.com', phone: '+1-555-0123' },
        workExperience: [{ company: 'Tech Corp', role: 'Engineer' }],
        education: [{ degree: 'BS CS', institution: 'University' }],
        skills: ['JavaScript', 'TypeScript'],
      };

      const score = parserService['calculateCompletenessScore'](data);
      expect(score).toBe(100);
    });
  });
});
```

### Integration Tests

```typescript
// tests/api.test.ts
import request from 'supertest';
import express from 'express';
import parseRoutes from '../src/routes/parse.routes';

const app = express();
app.use(express.json());
app.use('/api/v1', parseRoutes);

describe('API Integration Tests', () => {
  describe('GET /api/v1/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('POST /api/v1/parse', () => {
    it('should return 400 for missing file_url', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({ file_type: 'pdf', user_id: 'test_123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing file_type', async () => {
      const response = await request(app)
        .post('/api/v1/parse')
        .send({ file_url: 'https://example.com/resume.pdf', user_id: 'test_123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### Load Testing (Artillery)

**artillery.yml:**

```yaml
config:
  target: 'http://localhost:8001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 100
      name: 'Peak load'
  defaults:
    headers:
      X-Service-Key: 'test-api-key'

scenarios:
  - name: 'Resume parsing workflow'
    weight: 70
    flow:
      - post:
          url: '/api/v1/parse'
          json:
            file_url: 'https://example.com/resume.pdf'
            file_type: 'pdf'
            user_id: 'load_test_{{ $randomNumber() }}'

  - name: 'Health check'
    weight: 30
    flow:
      - get:
          url: '/api/v1/health'
```

**Run load tests:**

```bash
npm install -g artillery
artillery run artillery.yml
```

---

## Monitoring & Logging

### Logging Configuration

```python
# app/utils/logger.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "resume-parser",
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id
        return json.dumps(log_record)

def setup_logger():
    logger = logging.getLogger()
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger
```

### Metrics Collection

```python
# app/middleware/metrics.py
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import Request
import time

# Metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

model_inference_duration = Histogram(
    'model_inference_duration_seconds',
    'Model inference duration',
    ['model_name']
)

async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response
```

### Health Monitoring

```python
# app/routers/health.py
from fastapi import APIRouter
from app.models.ml_models import model_manager
import psutil
import torch

router = APIRouter()

@router.get("/health/detailed")
async def detailed_health_check():
    return {
        "status": "healthy",
        "models": {
            "loaded": model_manager.is_loaded(),
            "models_list": model_manager.get_loaded_models()
        },
        "system": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        },
        "gpu": {
            "available": torch.cuda.is_available(),
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
        }
    }
```

---

## Security Considerations

### API Key Authentication

```python
# app/middleware/auth.py
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
from app.config import get_settings

settings = get_settings()
api_key_header = APIKeyHeader(name="X-Service-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key"
        )
    return api_key
```

### Rate Limiting

```python
# app/middleware/rate_limit.py
from fastapi import Request, HTTPException
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio

class RateLimiter:
    def __init__(self, requests_per_minute: int = 100):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)

    async def check_rate_limit(self, request: Request):
        client_ip = request.client.host
        now = datetime.now()
        minute_ago = now - timedelta(minutes=1)

        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if req_time > minute_ago
        ]

        # Check limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded"
            )

        # Add current request
        self.requests[client_ip].append(now)
```

---

## Appendix

### A. Model Download Script

```python
# scripts/download_models.py
from transformers import AutoModel, AutoTokenizer
import os

MODELS = {
    "layoutlm": "microsoft/layoutlm-base-uncased",
    "ner": "dslim/bert-base-NER",
    "sentence-transformer": "sentence-transformers/all-mpnet-base-v2",
    "dialogpt": "microsoft/DialoGPT-medium",
    "t5": "google/flan-t5-base",
    "jobbert": "jjzha/jobbert-base-cased"
}

def download_model(model_name, model_id, cache_dir="./models"):
    print(f"Downloading {model_name}...")
    model_path = os.path.join(cache_dir, model_name)

    # Download model and tokenizer
    model = AutoModel.from_pretrained(model_id, cache_dir=model_path)
    tokenizer = AutoTokenizer.from_pretrained(model_id, cache_dir=model_path)

    print(f"{model_name} downloaded successfully!")

if __name__ == "__main__":
    for name, model_id in MODELS.items():
        download_model(name, model_id)
```

### B. Service Dependencies Matrix

| Service | Python | PyTorch | Transformers | FastAPI | Special Libraries |
|---------|--------|---------|--------------|---------|-------------------|
| Resume Parser | 3.10+ | 2.1.0 | 4.35.2 | 0.104.1 | LayoutLM, PyPDF2 |
| Job Recommender | 3.10+ | 2.1.0 | 4.35.2 | 0.104.1 | sentence-transformers |
| Quality Scorer | 3.10+ | 2.1.0 | 4.35.2 | 0.104.1 | NLTK, textstat |
| Chatbot | 3.10+ | 2.1.0 | 4.35.2 | 0.104.1 | Redis |
| JD Generator | 3.10+ | 2.1.0 | 4.35.2 | 0.104.1 | - |
| Skill Extractor | 3.10+ | 2.1.0 | 4.35.2 | 0.104.1 | spaCy |

---

**Document Version**: 1.0
**Last Updated**: 2025-10-04
**Maintained By**: AI/ML Team
**Next Review Date**: 2025-11-04
