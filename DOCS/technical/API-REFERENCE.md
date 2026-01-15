# API Reference

## Overview

| Property | Value |
|----------|-------|
| Base URL | `https://api.example.com` |
| Version | `v1` |
| Auth | JWT Bearer Token |
| Content-Type | `application/json` |

## Table of Contents

1. [Authentication](#authentication)
2. [Auth Service APIs](#auth-service-apis)
3. [User Service APIs](#user-service-apis)
4. [Job Service APIs](#job-service-apis)
5. [Application Service APIs](#application-service-apis)
6. [AI Service APIs](#ai-service-apis)
7. [Response Codes](#response-codes)
8. [Error Handling](#error-handling)

---

## Authentication

### JWT Bearer Token

All protected endpoints require:
```
Authorization: Bearer <token>
```

### Token Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "candidate|employer|admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

## Auth Service APIs

Base: `/api/v1/auth`

### POST /register

Create user account.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "candidate",
  "mobile": "+1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "john@example.com",
    "message": "Verification email sent"
  }
}
```

---

### POST /login

Authenticate user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 86400,
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "role": "candidate",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

---

### POST /social-login

OAuth authentication.

**Request:**
```json
{
  "provider": "google",
  "accessToken": "oauth-access-token",
  "idToken": "oauth-id-token"
}
```

---

### POST /send-otp

Send OTP for verification.

**Request:**
```json
{
  "email": "john@example.com",
  "purpose": "login"
}
```

---

### POST /verify-otp

Verify OTP.

**Request:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

---

### POST /forgot-password

Initiate password reset.

**Request:**
```json
{
  "email": "john@example.com"
}
```

---

### POST /reset-password

Complete password reset.

**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePass123!"
}
```

---

### POST /refresh-token

Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "expiresIn": 86400
  }
}
```

---

### POST /logout

Invalidate session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /verify-email

Verify email address.

**Request:**
```json
{
  "token": "verification-token"
}
```

---

### POST /enable-2fa

Enable two-factor authentication.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "base32-secret",
    "qrCode": "data:image/png;base64,..."
  }
}
```

---

### POST /verify-2fa

Verify 2FA code.

**Request:**
```json
{
  "code": "123456"
}
```

---

## User Service APIs

Base: `/api/v1`

### Profile Management

#### GET /profile

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profilePhoto": "https://...",
    "professionalSummary": "...",
    "totalExperienceYears": 5.5,
    "visibility": "public",
    "completionPercentage": 85,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### PUT /profile

Update profile.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "professionalSummary": "Senior developer with 5+ years...",
  "city": "New York",
  "state": "NY",
  "country": "USA"
}
```

---

#### POST /profile/photo

Upload profile photo.

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| photo | file | Image file (jpg, png) |

---

### Work Experience

#### GET /candidate/experience

List work experiences.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "companyName": "Tech Corp",
      "jobTitle": "Senior Developer",
      "employmentType": "full_time",
      "startDate": "2020-01-01",
      "endDate": null,
      "isCurrent": true,
      "description": "..."
    }
  ]
}
```

---

#### POST /candidate/experience

Add work experience.

**Request:**
```json
{
  "companyName": "Tech Corp",
  "jobTitle": "Senior Developer",
  "employmentType": "full_time",
  "location": "New York, NY",
  "startDate": "2020-01-01",
  "isCurrent": true,
  "description": "Led development of...",
  "skillsUsed": ["JavaScript", "React", "Node.js"]
}
```

---

#### PUT /candidate/experience/:id

Update work experience.

---

#### DELETE /candidate/experience/:id

Delete work experience.

---

### Education

#### GET /candidate/education

List education records.

---

#### POST /candidate/education

Add education.

**Request:**
```json
{
  "level": "bachelors",
  "institution": "MIT",
  "degree": "B.S. Computer Science",
  "fieldOfStudy": "Computer Science",
  "startDate": "2014-09-01",
  "endDate": "2018-05-01",
  "grade": "3.8 GPA"
}
```

---

#### PUT /candidate/education/:id

Update education.

---

#### DELETE /candidate/education/:id

Delete education.

---

### Skills

#### GET /skills

List all available skills.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| category | string | technical, soft |
| search | string | Search term |

---

#### GET /candidate/skills

Get user's skills.

---

#### POST /candidate/skills

Add skill to profile.

**Request:**
```json
{
  "skillId": "uuid",
  "proficiencyLevel": "advanced",
  "yearsOfExperience": 3.5
}
```

---

#### DELETE /candidate/skills/:skillId

Remove skill.

---

### Certifications

#### GET /candidate/certifications

List certifications.

---

#### POST /candidate/certifications

Add certification.

**Request:**
```json
{
  "name": "AWS Solutions Architect",
  "issuingOrganization": "Amazon Web Services",
  "issueDate": "2023-01-15",
  "expiryDate": "2026-01-15",
  "credentialId": "ABC123",
  "credentialUrl": "https://..."
}
```

---

### Resumes

#### GET /candidate/resumes

List uploaded resumes.

---

#### POST /candidate/resumes

Upload resume.

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| file | file | Resume file (pdf, doc, docx) |
| resumeName | string | Display name |
| isDefault | boolean | Set as default |

---

#### DELETE /candidate/resumes/:id

Delete resume.

---

#### PUT /candidate/resumes/:id/default

Set resume as default.

---

### Job Preferences

#### GET /candidate/preferences

Get job preferences.

---

#### PUT /candidate/preferences

Update preferences.

**Request:**
```json
{
  "jobTypes": ["full_time", "contract"],
  "preferredLocations": ["New York", "San Francisco", "Remote"],
  "willingToRelocate": true,
  "expectedSalaryMin": 100000,
  "expectedSalaryMax": 150000,
  "salaryCurrency": "USD",
  "noticePeriod": "1_month",
  "jobSearchStatus": "actively_looking"
}
```

---

### Onboarding

#### GET /onboarding/status

Get onboarding progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStep": 3,
    "totalSteps": 5,
    "completedSteps": ["basic_info", "experience", "education"],
    "isCompleted": false
  }
}
```

---

#### POST /onboarding/complete-step

Complete onboarding step.

**Request:**
```json
{
  "step": "skills",
  "data": {...}
}
```

---

## Job Service APIs

Base: `/api/v1`

### Job Search

#### GET /jobs

Search jobs with filters.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| q | string | Search keyword |
| location | string | City/State |
| city | string | City name |
| state | string | State name |
| jobType | string | full_time, part_time, contract, gig, remote |
| experienceLevel | string | entry, mid, senior, lead |
| salaryMin | number | Minimum salary |
| salaryMax | number | Maximum salary |
| categoryId | uuid | Job category |
| companyId | uuid | Company filter |
| remote | boolean | Remote jobs only |
| featured | boolean | Featured jobs only |
| page | number | Page number (default: 1) |
| limit | number | Per page (default: 20, max: 100) |
| sort | string | relevance, date, salary |

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "title": "Senior Software Engineer",
        "company": {
          "id": "uuid",
          "name": "Tech Corp",
          "logo": "https://..."
        },
        "location": "New York, NY",
        "jobType": "full_time",
        "experienceLevel": "senior",
        "salaryMin": 120000,
        "salaryMax": 180000,
        "skills": ["JavaScript", "React", "Node.js"],
        "isFeatured": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

#### GET /jobs/:id

Get job details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Senior Software Engineer",
    "description": "We are looking for...",
    "company": {...},
    "location": "New York, NY",
    "jobType": "full_time",
    "experienceLevel": "senior",
    "salaryMin": 120000,
    "salaryMax": 180000,
    "showSalary": true,
    "skills": ["JavaScript", "React", "Node.js"],
    "screeningQuestions": [
      {
        "id": "uuid",
        "question": "Years of React experience?",
        "questionType": "text",
        "isRequired": true
      }
    ],
    "deadline": "2024-03-01T00:00:00Z",
    "viewCount": 1250,
    "applicationCount": 45,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### GET /jobs/recommendations

Get AI-powered recommendations.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| limit | number | Number of recommendations (default: 10) |

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "job": {...},
        "score": 95,
        "reasons": ["skill_match", "experience_match", "location_match"]
      }
    ]
  }
}
```

---

### Employer Job Management

#### POST /jobs

Create job posting (Employer).

**Request:**
```json
{
  "title": "Senior Software Engineer",
  "description": "We are looking for...",
  "jobType": "full_time",
  "workType": "hybrid",
  "experienceLevel": "senior",
  "location": "New York, NY",
  "city": "New York",
  "state": "NY",
  "salaryMin": 120000,
  "salaryMax": 180000,
  "showSalary": true,
  "skills": ["JavaScript", "React", "Node.js"],
  "categoryId": "uuid",
  "deadline": "2024-03-01",
  "screeningQuestions": [
    {
      "question": "Years of React experience?",
      "questionType": "text",
      "isRequired": true
    }
  ]
}
```

---

#### PUT /jobs/:id

Update job posting.

---

#### DELETE /jobs/:id

Delete job posting.

---

#### PUT /jobs/:id/status

Update job status.

**Request:**
```json
{
  "isActive": false
}
```

---

### Saved Jobs

#### GET /jobs/saved

Get saved jobs.

---

#### POST /jobs/:id/save

Save job.

---

#### DELETE /jobs/:id/save

Remove saved job.

---

### Job Categories

#### GET /jobs/categories

List job categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Engineering",
      "slug": "engineering",
      "icon": "code",
      "subcategories": [
        {
          "id": "uuid",
          "name": "Software Development",
          "slug": "software-development"
        }
      ]
    }
  ]
}
```

---

### Saved Searches

#### GET /saved-searches

List saved searches.

---

#### POST /saved-searches

Create saved search.

**Request:**
```json
{
  "name": "Remote React Jobs",
  "searchCriteria": {
    "q": "react",
    "jobType": "remote",
    "experienceLevel": "senior"
  },
  "alertEnabled": true,
  "alertFrequency": "daily"
}
```

---

### Company

#### GET /company/:id

Get company profile.

---

#### GET /company/:id/jobs

Get company's job listings.

---

## Application Service APIs

Base: `/api/v1`

### Job Applications (Candidate)

#### POST /applications

Submit application.

**Request:**
```json
{
  "jobId": "uuid",
  "resumeId": "uuid",
  "coverLetter": "I am excited to apply...",
  "screeningAnswers": [
    {
      "questionId": "uuid",
      "answer": "5 years"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "jobId": "uuid",
    "status": "applied",
    "appliedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

#### GET /applications

List my applications.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| page | number | Page number |
| limit | number | Per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "job": {
          "id": "uuid",
          "title": "Senior Developer",
          "company": {...}
        },
        "status": "interview_scheduled",
        "appliedAt": "2024-01-15T10:00:00Z",
        "interviews": [...]
      }
    ],
    "pagination": {...}
  }
}
```

---

#### GET /applications/:id

Get application details.

---

#### POST /applications/:id/withdraw

Withdraw application.

---

### Employer Application Management

#### GET /employers/candidates

List applicants for employer's jobs.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| jobId | uuid | Filter by job |
| status | string | Filter by status |
| rating | number | Minimum rating |

---

#### GET /employers/candidates/:applicationId

Get applicant details.

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid",
      "status": "shortlisted",
      "coverLetter": "...",
      "screeningAnswers": [...],
      "rating": 4,
      "notes": "Strong candidate"
    },
    "candidate": {
      "profile": {...},
      "resume": {...}
    }
  }
}
```

---

#### PUT /status/:applicationId

Update application status.

**Request:**
```json
{
  "status": "shortlisted",
  "notes": "Great experience, schedule interview"
}
```

---

#### PUT /employers/candidates/:applicationId/rating

Rate applicant.

**Request:**
```json
{
  "rating": 5
}
```

---

### Interviews

#### POST /interviews

Schedule interview.

**Request:**
```json
{
  "applicationId": "uuid",
  "interviewType": "video",
  "scheduledAt": "2024-01-20T14:00:00Z",
  "duration": 60,
  "location": "Google Meet: https://..."
}
```

---

#### GET /interviews

List interviews.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| status | string | scheduled, completed, canceled |
| upcoming | boolean | Only future interviews |

---

#### PUT /interviews/:id

Update interview.

---

#### PUT /interviews/:id/status

Update interview status.

**Request:**
```json
{
  "status": "completed",
  "interviewerNotes": "Excellent technical skills..."
}
```

---

#### DELETE /interviews/:id

Cancel interview.

---

## AI Service APIs

### Resume Parser (Port 8001)

#### POST /api/v1/parse

Parse resume document.

**Request:**
```json
{
  "file_url": "https://storage.../resume.pdf",
  "file_type": "pdf"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "personal_info": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "location": "New York, NY"
    },
    "work_experience": [
      {
        "company": "Tech Corp",
        "title": "Senior Developer",
        "start_date": "2020-01",
        "end_date": null,
        "is_current": true,
        "description": "..."
      }
    ],
    "education": [...],
    "skills": ["JavaScript", "React", "Node.js"],
    "certifications": [...],
    "confidence_scores": {
      "personal_info": 0.95,
      "work_experience": 0.88,
      "skills": 0.92
    }
  }
}
```

---

### Job Recommender (Port 8002)

#### POST /api/v1/recommend

Get job recommendations.

**Request:**
```json
{
  "user_id": "uuid",
  "profile": {
    "skills": ["JavaScript", "React"],
    "experience_years": 5,
    "preferred_locations": ["New York", "Remote"],
    "salary_expectation": 150000
  },
  "top_k": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "job_id": "uuid",
        "score": 0.95,
        "match_breakdown": {
          "skills": 0.98,
          "experience": 0.92,
          "location": 1.0,
          "salary": 0.90
        },
        "reasons": [
          "95% skill match",
          "Experience level aligned",
          "Location preference matched"
        ]
      }
    ]
  }
}
```

---

### Quality Scorer (Port 8003)

#### POST /api/v1/score

Score resume quality.

**Request:**
```json
{
  "resume_text": "John Doe\nSenior Software Engineer...",
  "target_job_description": "Looking for senior developer..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quality_score": 85,
    "ats_score": 78,
    "breakdown": {
      "formatting": 90,
      "keywords": 75,
      "experience_clarity": 88,
      "skill_relevance": 82,
      "grammar": 95
    },
    "suggestions": [
      {
        "category": "keywords",
        "issue": "Missing key technologies mentioned in JD",
        "suggestion": "Add TypeScript and AWS to skills section"
      }
    ]
  }
}
```

---

### Skill Extractor (Port 8006)

#### POST /api/v1/extract

Extract skills from text.

**Request:**
```json
{
  "text": "Senior developer with experience in React, Node.js, and AWS..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "name": "React",
        "category": "technical",
        "confidence": 0.98
      },
      {
        "name": "Node.js",
        "category": "technical",
        "confidence": 0.96
      }
    ]
  }
}
```

---

## Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 204 | No Content | Success, no body |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Invalid/missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Business logic error |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Internal error |

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTH_FAILED` | Authentication failed |
| `TOKEN_EXPIRED` | JWT token expired |
| `TOKEN_INVALID` | JWT token invalid |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE` | Resource already exists |
| `FORBIDDEN` | Permission denied |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `SERVICE_UNAVAILABLE` | Downstream service down |

### Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Pagination

### Request

```
GET /jobs?page=2&limit=20
```

### Response

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## Versioning

API versioned via URL path:
```
/api/v1/...
/api/v2/...
```

Version header (optional):
```
X-API-Version: 1
```
