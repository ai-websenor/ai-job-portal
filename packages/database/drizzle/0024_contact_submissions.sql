-- Create contact_submission_status enum
CREATE TYPE "contact_submission_status" AS ENUM ('new', 'read', 'responded', 'archived');

-- Create contact_submissions table for public contact form submissions
CREATE TABLE IF NOT EXISTS "contact_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "status" "contact_submission_status" DEFAULT 'new',
  "admin_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
