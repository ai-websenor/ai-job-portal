CREATE TYPE "public"."account_type" AS ENUM('individual', 'company');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('web', 'android', 'ios');--> statement-breakpoint
CREATE TYPE "public"."interview_mode" AS ENUM('online', 'offline');--> statement-breakpoint
CREATE TYPE "public"."interview_tool" AS ENUM('zoom', 'teams', 'phone', 'other');--> statement-breakpoint
CREATE TYPE "public"."skill_type" AS ENUM('master-typed', 'user-typed');--> statement-breakpoint
CREATE TYPE "public"."template_level" AS ENUM('fresher', 'mid', 'experienced');--> statement-breakpoint
ALTER TYPE "public"."application_status" ADD VALUE 'interview_completed' BEFORE 'rejected';--> statement-breakpoint
CREATE TABLE "master_degrees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"level" "education_level" NOT NULL,
	"type" "skill_type" DEFAULT 'master-typed' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_fields_of_study" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"degree_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" "skill_type" DEFAULT 'master-typed' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_avatars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"gender" varchar(20) DEFAULT 'other',
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_name" varchar(100) DEFAULT 'AI Job Portal' NOT NULL,
	"logo_url" varchar(500),
	"support_email" varchar(255),
	"support_phone" varchar(20),
	"contact_email" varchar(255),
	"company_address" text,
	"domain_url" varchar(500),
	"footer_text" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"value" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" RENAME TO "login_history";--> statement-breakpoint
ALTER TABLE "permissions" RENAME COLUMN "code" TO "name";--> statement-breakpoint
ALTER TABLE "email_templates" RENAME COLUMN "slug" TO "template_key";--> statement-breakpoint
ALTER TABLE "email_templates" RENAME COLUMN "body" TO "content";--> statement-breakpoint
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_code_unique";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "login_history" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "permissions_action_idx";--> statement-breakpoint
DROP INDEX "role_permissions_role_idx";--> statement-breakpoint
DROP INDEX "role_permissions_permission_idx";--> statement-breakpoint
DROP INDEX "user_roles_unique";--> statement-breakpoint
DROP INDEX "user_roles_user_idx";--> statement-breakpoint
DROP INDEX "user_roles_role_idx";--> statement-breakpoint
DROP INDEX "audit_logs_user_idx";--> statement-breakpoint
DROP INDEX "audit_logs_action_idx";--> statement-breakpoint
DROP INDEX "audit_logs_resource_idx";--> statement-breakpoint
DROP INDEX "audit_logs_created_idx";--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "resource" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "login_history" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_skills" ALTER COLUMN "proficiency_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "kyc_documents" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "kyc_documents" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "video_resumes" ALTER COLUMN "moderation_status" SET DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "video_profile_status" "moderation_status";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "video_rejection_reason" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "video_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "employers" ADD COLUMN "rbac_role_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_type" "account_type";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "type" "skill_type" DEFAULT 'master-typed' NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "gst_document_url" varchar(500);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "gst_validation_status" varchar(20);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "gst_extracted_data" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "state_code" varchar(5);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "pincode" varchar(10);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_email" varchar(255);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "sub_category_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "custom_category" varchar(255);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "custom_sub_category" varchar(255);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "interview_mode" "interview_mode" DEFAULT 'online';--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "interview_tool" "interview_tool";--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "meeting_password" varchar(100);--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "host_join_url" varchar(500);--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "zoom_meeting_id" varchar(255);--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "teams_meeting_id" varchar(255);--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "dial_in_info" jsonb;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "meeting_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "meeting_error" text;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "rescheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "reminder_30m_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "resume_templates" ADD COLUMN "template_type" varchar(100);--> statement-breakpoint
ALTER TABLE "resume_templates" ADD COLUMN "template_level" "template_level";--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "structured_data" text;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "title" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "logo_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "cta_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "cta_text" varchar(100);--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "cta_url" varchar(500);--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "cta_relative_path" varchar(500);--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "banner_image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "member_adding_limit" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "member_adding_limit" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "member_adding_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "message_threads" ADD COLUMN "created_by_employer_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "status" varchar(20) DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "master_fields_of_study" ADD CONSTRAINT "master_fields_of_study_degree_id_master_degrees_id_fk" FOREIGN KEY ("degree_id") REFERENCES "public"."master_degrees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_device_tokens_token" ON "device_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_device_tokens_user_id" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_filter_options_group_value" ON "filter_options" USING btree ("group","value");--> statement-breakpoint
CREATE INDEX "idx_filter_options_group" ON "filter_options" USING btree ("group");--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employers" ADD CONSTRAINT "employers_rbac_role_id_roles_id_fk" FOREIGN KEY ("rbac_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_sub_category_id_job_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."job_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_created_by_employer_id_employers_id_fk" FOREIGN KEY ("created_by_employer_id") REFERENCES "public"."employers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_applications_company_id" ON "job_applications" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_name_unique" ON "permissions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_unique" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_roles_company_id_idx" ON "user_roles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "login_history_user_id_idx" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jobs_sub_category_id" ON "jobs" USING btree ("sub_category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_templates_key" ON "email_templates" USING btree ("template_key");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_super_admin";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "action";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "resource";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "resource_id";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "old_value";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "new_value";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "error_message";--> statement-breakpoint
ALTER TABLE "login_history" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "skills" DROP COLUMN "is_custom";--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_template_key_unique" UNIQUE("template_key");--> statement-breakpoint
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('candidate', 'employer', 'super_employer', 'admin', 'team_member', 'super_admin');--> statement-breakpoint
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";