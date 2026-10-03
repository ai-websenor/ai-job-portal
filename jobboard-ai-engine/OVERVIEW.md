# AI Engine — Overview

## What is this?

This is the **AI brain** behind a job portal (a website where people find jobs and companies find candidates).

On its own, a normal website can store data and show pages, but it cannot "understand" a resume or answer questions in plain language. This project adds that intelligence. It is a separate service that the main website talks to whenever it needs something smart done.

## What does it do?

It handles three main jobs:

1. **Reading resumes (Resume Parsing)**
   A person uploads their resume as a PDF. This service reads the file, understands it, and turns it into clean, organized information — name, contact details, work experience, education, skills, and so on. That structured data can then be saved and searched.

2. **Answering questions (Chatbot)**
   A candidate looking at a job can ask questions about it (the role, the company, the requirements) and get helpful answers in normal conversation, instead of scrolling through a long description.

3. **Suggesting jobs (Recommendations)**
   Based on a person's skills, experience, and location, it suggests jobs that are a good match for them.

## How it works (simple picture)

```
User uploads resume (PDF)
        │
        ▼
  This AI Engine
        │
   ┌────┴─────────────────────────┐
   │ 1. Read the PDF text          │
   │ 2. Ask the AI to organize it  │
   │ 3. Return clean information   │
   └───────────────────────────────┘
        │
        ▼
  Saved to database / shown to user
```

Because reading a resume can take a little time, the service does it in the background and lets the website check on the progress — so nothing freezes while it works.

## Technologies used (and why)

| Technology | What it is | Why it's used here |
|------------|-----------|--------------------|
| **Python** | A programming language | The whole service is written in it — good for AI and data work |
| **FastAPI** | A tool for building web services | Handles requests from the main website (upload resume, ask question, etc.) |
| **Uvicorn** | A web server | Actually runs the service so it can be reached online |
| **Qwen (LLM)** | An AI language model | The "brain" that understands resumes and answers questions |
| **pypdfium2 / python-docx** | Document readers | Pull the text out of PDF (and Word) files |
| **PostgreSQL** | A database | Stores resumes, jobs, users, and results |
| **Redis / Valkey** | A fast memory store | Remembers chat conversations between messages |
| **AWS S3** | Online file storage | Keeps the uploaded resume files safely in the cloud |
| **AWS (EC2 / ECS)** | Cloud servers | Where the AI model and this service actually run |
| **Docker** | Packaging tool | Bundles the service so it runs the same way everywhere |
| **Pydantic** | Data checker | Makes sure incoming data is valid and safe |

## In one line

**A cloud service that uses AI to read resumes, chat about jobs, and recommend the right jobs to the right people — so the job portal feels smart.**
