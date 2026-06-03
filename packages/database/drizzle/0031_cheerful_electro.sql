CREATE TYPE "public"."grade_type" AS ENUM('cgpa', 'percentage');--> statement-breakpoint
ALTER TABLE "education_records" ADD COLUMN "grade_type" "grade_type";