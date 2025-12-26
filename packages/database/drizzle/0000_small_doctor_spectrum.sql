DO $$ BEGIN
 CREATE TYPE "admin_role" AS ENUM('super_admin', 'admin', 'moderator', 'support');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "billing_cycle" AS ENUM('one_time', 'monthly', 'quarterly', 'yearly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "data_type" AS ENUM('string', 'number', 'boolean', 'json');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "discount_type" AS ENUM('percentage', 'fixed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "page_status" AS ENUM('draft', 'published');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "priority" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "sender_type" AS ENUM('user', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "diversity_level" AS ENUM('low', 'medium', 'high');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "interaction_type" AS ENUM('view', 'apply', 'save', 'share', 'not_interested');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "parsing_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_action" AS ENUM('viewed', 'applied', 'saved', 'ignored', 'not_interested');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "branding_tier" AS ENUM('free', 'premium', 'enterprise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "media_type" AS ENUM('photo', 'video');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "application_status" AS ENUM('applied', 'viewed', 'shortlisted', 'interview_scheduled', 'rejected', 'hired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "interview_status" AS ENUM('scheduled', 'confirmed', 'completed', 'rescheduled', 'canceled', 'no_show');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "social_provider" AS ENUM('google', 'linkedin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "company_size" AS ENUM('1-10', '11-50', '51-200', '201-500', '500+');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "company_type" AS ENUM('startup', 'sme', 'mnc', 'government');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "share_channel" AS ENUM('whatsapp', 'email', 'linkedin', 'twitter', 'facebook', 'copy_link');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "verification_status" AS ENUM('pending', 'verified', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "subscription_plan" AS ENUM('free', 'basic', 'premium', 'enterprise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('candidate', 'employer', 'admin', 'team_member');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "experience_level" AS ENUM('entry', 'mid', 'senior', 'lead');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "job_type" AS ENUM('full_time', 'part_time', 'contract', 'gig', 'remote');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_channel" AS ENUM('email', 'sms', 'whatsapp', 'push');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('job_alert', 'application_update', 'interview', 'message', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_method" AS ENUM('credit_card', 'debit_card', 'upi', 'netbanking', 'wallet');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "document_type" AS ENUM('resume', 'cover_letter', 'certificate', 'id_proof', 'portfolio', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "education_level" AS ENUM('high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'freelance');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "file_type" AS ENUM('pdf', 'doc', 'docx');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "gender" AS ENUM('male', 'female', 'other', 'not_specified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "job_search_status" AS ENUM('actively_looking', 'open_to_opportunities', 'not_looking');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notice_period" AS ENUM('immediate', '15_days', '1_month', '2_months', '3_months');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "proficiency_level" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "skill_category" AS ENUM('technical', 'soft', 'language', 'industry_specific');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "visibility" AS ENUM('public', 'private', 'semi_private');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_shift" AS ENUM('day', 'night', 'rotational', 'flexible');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "frequency" AS ENUM('instant', 'hourly', 'daily', 'weekly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_channel_enhanced" AS ENUM('email', 'push', 'sms', 'whatsapp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "queue_priority" AS ENUM('high', 'medium', 'low');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "queue_status" AS ENUM('queued', 'processing', 'sent', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "moderation_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "privacy_setting" AS ENUM('public', 'employers_only', 'private');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "sender" AS ENUM('user', 'bot', 'agent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "video_status" AS ENUM('uploading', 'processing', 'approved', 'rejected', 'active');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "entity_type" AS ENUM('candidate', 'job', 'task', 'note');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "related_to_type" AS ENUM('job', 'candidate', 'interview');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "task_priority" AS ENUM('high', 'medium', 'low');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "task_status" AS ENUM('open', 'in_progress', 'completed', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "team_role" AS ENUM('admin', 'recruiter', 'hiring_manager', 'interviewer', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" varchar(255) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"changes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "admin_role" NOT NULL,
	"permissions" text,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"meta_title" varchar(255),
	"meta_description" text,
	"meta_keywords" text,
	"status" "page_status" DEFAULT 'draft',
	"published_at" timestamp,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_purchase_amount" numeric(10, 2),
	"max_discount_amount" numeric(10, 2),
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"applicable_plans" text,
	"is_active" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_categories_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"icon_url" varchar(500),
	"image_url" varchar(500),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_categories_admin_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"data_type" "data_type" NOT NULL,
	"category" varchar(100),
	"description" text,
	"is_public" boolean DEFAULT false,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"billing_cycle" "billing_cycle" NOT NULL,
	"features" text,
	"job_post_limit" integer,
	"resume_access_limit" integer,
	"featured_jobs" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" varchar(255) NOT NULL,
	"category" varchar(100),
	"priority" "priority" DEFAULT 'medium',
	"status" "ticket_status" DEFAULT 'open',
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_type" "sender_type" NOT NULL,
	"sender_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_internal_note" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ml_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"algorithm_type" varchar(100),
	"parameters" text,
	"performance_metrics" text,
	"training_date" timestamp,
	"deployment_date" timestamp,
	"is_active" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parsed_resume_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"personal_info" text,
	"work_experiences" text,
	"education" text,
	"skills" text,
	"certifications" text,
	"projects" text,
	"confidence_scores" text,
	"raw_text" text,
	"parsed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommendation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"match_score" numeric(5, 2) NOT NULL,
	"recommendation_reason" text,
	"algorithm_version" varchar(50),
	"user_action" "user_action",
	"position_in_list" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"actioned_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resume_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"quality_score" numeric(5, 2),
	"quality_breakdown" text,
	"ats_score" numeric(5, 2),
	"ats_issues" text,
	"suggestions" text,
	"keyword_matches" text,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"interaction_type" "interaction_type" NOT NULL,
	"match_score" numeric(5, 2),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"session_id" varchar(100),
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_recommendation_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_types" text,
	"locations" text,
	"salary_min" numeric(10, 2),
	"salary_max" numeric(10, 2),
	"industries" text,
	"excluded_companies" text,
	"diversity_level" "diversity_level" DEFAULT 'medium',
	"notification_enabled" boolean DEFAULT true,
	"min_match_score_for_notification" integer DEFAULT 85,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_recommendation_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_name" varchar(100) NOT NULL,
	"event_properties" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"session_id" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"media_type" "media_type" NOT NULL,
	"media_url" varchar(500) NOT NULL,
	"thumbnail_url" varchar(500),
	"category" varchar(100),
	"caption" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"hero_banner_url" varchar(500),
	"tagline" varchar(255),
	"about" text,
	"mission" text,
	"culture" text,
	"benefits" text,
	"is_published" boolean DEFAULT false,
	"branding_tier" "branding_tier" DEFAULT 'free',
	"custom_domain" varchar(255),
	"custom_colors" text,
	"seo_title" varchar(100),
	"seo_description" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_name" varchar(255) NOT NULL,
	"job_title" varchar(255) NOT NULL,
	"photo_url" varchar(500),
	"testimonial" text NOT NULL,
	"video_url" varchar(500),
	"is_approved" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metric_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"metric_value" text NOT NULL,
	"period" varchar(50) NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regional_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"settings" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "regions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"previous_status" "application_status",
	"new_status" "application_status" NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"job_seeker_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"cover_letter" text,
	"resume_url" varchar(500),
	"screening_answers" json,
	"rating" integer,
	"notes" text,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"viewed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"interview_type" varchar(50) NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"location" varchar(255),
	"interviewer_notes" text,
	"candidate_feedback" text,
	"status" "interview_status" DEFAULT 'scheduled' NOT NULL,
	"calendar_event_id" varchar(255),
	"reminder_sent" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verifications_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"refresh_token" varchar(500),
	"ip_address" varchar(45),
	"user_agent" text,
	"device_info" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token"),
	CONSTRAINT "sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_logins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "social_provider" NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applicant_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applicant_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"color" varchar(20),
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"industry" varchar(100),
	"company_size" "company_size",
	"year_established" integer,
	"company_type" "company_type",
	"website" varchar(500),
	"description" text,
	"mission" text,
	"culture" text,
	"benefits" text,
	"logo_url" varchar(500),
	"banner_url" varchar(500),
	"tagline" varchar(255),
	"is_verified" boolean DEFAULT false,
	"verification_status" "verification_status" DEFAULT 'pending',
	"verification_documents" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"user_id" uuid,
	"share_channel" "share_channel" NOT NULL,
	"shared_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"user_id" uuid,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"search_criteria" text NOT NULL,
	"alert_enabled" boolean DEFAULT true,
	"alert_frequency" varchar(20) DEFAULT 'daily',
	"alert_channels" text,
	"last_alert_sent" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_seeker_id" uuid NOT NULL,
	"institution" varchar(255) NOT NULL,
	"degree" varchar(255) NOT NULL,
	"field" varchar(255),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"company_logo" varchar(500),
	"website" varchar(255),
	"industry" varchar(100),
	"company_size" varchar(50),
	"description" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"subscription_plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"subscription_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_seekers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"location" varchar(255),
	"bio" text,
	"resume_url" varchar(500),
	"video_resume_url" varchar(500),
	"skills" text[],
	"profile_completeness" varchar(10) DEFAULT '0',
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"permissions" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"role" "user_role" DEFAULT 'candidate' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_mobile_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"two_factor_secret" varchar(255),
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_seeker_id" uuid NOT NULL,
	"company" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text,
	"location" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_seeker_id" uuid NOT NULL,
	"keywords" text[],
	"location" varchar(255),
	"job_type" text[],
	"salary_min" integer,
	"salary_max" integer,
	"frequency" varchar(20) DEFAULT 'instant' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sent" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "job_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_category_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"job_type" "job_type" NOT NULL,
	"experience_level" "experience_level" NOT NULL,
	"location" varchar(255) NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"show_salary" boolean DEFAULT true NOT NULL,
	"skills" text[],
	"deadline" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_highlighted" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"application_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"job_seeker_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "screening_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"question" text NOT NULL,
	"question_type" varchar(20) NOT NULL,
	"options" text[],
	"is_required" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_alerts" boolean DEFAULT true NOT NULL,
	"application_updates" boolean DEFAULT true NOT NULL,
	"interview_reminders" boolean DEFAULT true NOT NULL,
	"messages" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"invoice_url" varchar(500),
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method",
	"payment_gateway" varchar(50) NOT NULL,
	"transaction_id" varchar(255),
	"gateway_order_id" varchar(255),
	"gateway_payment_id" varchar(255),
	"invoice_number" varchar(50),
	"invoice_url" varchar(500),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"plan" varchar(50) NOT NULL,
	"billing_cycle" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"job_posting_limit" integer DEFAULT 1 NOT NULL,
	"job_posting_used" integer DEFAULT 0 NOT NULL,
	"featured_jobs_limit" integer DEFAULT 0 NOT NULL,
	"featured_jobs_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transaction_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"status" "payment_status" NOT NULL,
	"message" text,
	"gateway_response" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"issuing_organization" varchar(255) NOT NULL,
	"issue_date" date NOT NULL,
	"expiry_date" date,
	"credential_id" varchar(255),
	"credential_url" varchar(500),
	"certificate_file" varchar(500),
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "education_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"level" "education_level" NOT NULL,
	"institution" varchar(255) NOT NULL,
	"degree" varchar(255) NOT NULL,
	"field_of_study" varchar(255),
	"start_date" date NOT NULL,
	"end_date" date,
	"grade" varchar(50),
	"honors" text,
	"relevant_coursework" text,
	"certificate_url" varchar(500),
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"job_types" text,
	"preferred_locations" text,
	"willing_to_relocate" boolean DEFAULT false,
	"expected_salary_min" numeric(10, 2),
	"expected_salary_max" numeric(10, 2),
	"salary_currency" varchar(10) DEFAULT 'INR',
	"notice_period" "notice_period",
	"preferred_industries" text,
	"work_shift" "work_shift",
	"job_search_status" "job_search_status",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_preferences_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"document_type" "document_type" NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size" integer,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"proficiency_level" "proficiency_level",
	"years_of_experience" numeric(4, 1),
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"employer_id" uuid NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"source" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100),
	"middle_name" varchar(100),
	"last_name" varchar(100),
	"date_of_birth" date,
	"gender" "gender",
	"phone" varchar(20),
	"alternate_phone" varchar(20),
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"pin_code" varchar(20),
	"profile_photo" varchar(500),
	"professional_summary" text,
	"total_experience_years" numeric(4, 2),
	"visibility" "visibility" DEFAULT 'public',
	"is_profile_complete" boolean DEFAULT false,
	"completion_percentage" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size" integer,
	"file_type" "file_type" NOT NULL,
	"resume_name" varchar(255),
	"is_default" boolean DEFAULT false,
	"is_built_with_builder" boolean DEFAULT false,
	"template_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" "skill_category",
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"job_title" varchar(255) NOT NULL,
	"employment_type" "employment_type",
	"location" varchar(255),
	"is_current" boolean DEFAULT false,
	"start_date" date NOT NULL,
	"end_date" date,
	"description" text,
	"achievements" text,
	"skills_used" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_alerts_enhanced" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"search_criteria" text NOT NULL,
	"frequency" "frequency" DEFAULT 'daily',
	"channels" text,
	"is_active" boolean DEFAULT true,
	"last_triggered" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"channel" "notification_channel_enhanced" NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(255),
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending',
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"error_message" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences_enhanced" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"email_enabled" boolean DEFAULT true,
	"push_enabled" boolean DEFAULT true,
	"sms_enabled" boolean DEFAULT false,
	"whatsapp_enabled" boolean DEFAULT false,
	"frequency" "frequency" DEFAULT 'instant',
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"timezone" varchar(50) DEFAULT 'UTC',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"channel" "notification_channel_enhanced" NOT NULL,
	"priority" "queue_priority" DEFAULT 'medium',
	"scheduled_for" timestamp NOT NULL,
	"payload" text NOT NULL,
	"status" "queue_status" DEFAULT 'queued',
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sender" "sender" NOT NULL,
	"message" text NOT NULL,
	"intent" varchar(100),
	"confidence" numeric(5, 2),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"messages_count" integer DEFAULT 0,
	"escalated_to_human" boolean DEFAULT false,
	"satisfaction_rating" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participants" text NOT NULL,
	"job_id" uuid,
	"application_id" uuid,
	"last_message_at" timestamp,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"attachments" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"viewer_id" uuid,
	"view_duration_seconds" integer,
	"completed" boolean DEFAULT false,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"original_url" varchar(500) NOT NULL,
	"processed_urls" text,
	"thumbnail_url" varchar(500),
	"duration_seconds" integer,
	"file_size_mb" numeric(10, 2),
	"resolution" varchar(20),
	"format" varchar(20),
	"transcription" text,
	"status" "video_status" DEFAULT 'uploading',
	"privacy_setting" "privacy_setting" DEFAULT 'employers_only',
	"moderation_status" "moderation_status" DEFAULT 'pending',
	"moderation_notes" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"changes" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"comment_text" text NOT NULL,
	"mentions" text,
	"is_important" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"assigned_to" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"related_to_type" "related_to_type",
	"related_to_id" uuid,
	"priority" "task_priority" DEFAULT 'medium',
	"status" "task_status" DEFAULT 'open',
	"due_date" date,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members_collaboration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_role" NOT NULL,
	"permissions" text,
	"invited_by" uuid,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_activity_log" ADD CONSTRAINT "admin_activity_log_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_admin_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ml_models" ADD CONSTRAINT "ml_models_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parsed_resume_data" ADD CONSTRAINT "parsed_resume_data_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parsed_resume_data" ADD CONSTRAINT "parsed_resume_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendation_logs" ADD CONSTRAINT "recommendation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendation_logs" ADD CONSTRAINT "recommendation_logs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resume_analysis" ADD CONSTRAINT "resume_analysis_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_recommendation_preferences" ADD CONSTRAINT "user_recommendation_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regional_pricing" ADD CONSTRAINT "regional_pricing_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_history" ADD CONSTRAINT "application_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_job_seeker_id_job_seekers_id_fk" FOREIGN KEY ("job_seeker_id") REFERENCES "job_seekers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_logins" ADD CONSTRAINT "social_logins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applicant_notes" ADD CONSTRAINT "applicant_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applicant_tags" ADD CONSTRAINT "applicant_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_views" ADD CONSTRAINT "job_views_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_views" ADD CONSTRAINT "job_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "education" ADD CONSTRAINT "education_job_seeker_id_job_seekers_id_fk" FOREIGN KEY ("job_seeker_id") REFERENCES "job_seekers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employers" ADD CONSTRAINT "employers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_seekers" ADD CONSTRAINT "job_seekers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_experience" ADD CONSTRAINT "work_experience_job_seeker_id_job_seekers_id_fk" FOREIGN KEY ("job_seeker_id") REFERENCES "job_seekers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_category_relations" ADD CONSTRAINT "job_category_relations_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_category_relations" ADD CONSTRAINT "job_category_relations_category_id_job_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "job_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "screening_questions" ADD CONSTRAINT "screening_questions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certifications" ADD CONSTRAINT "certifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "education_records" ADD CONSTRAINT "education_records_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_preferences" ADD CONSTRAINT "job_preferences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resumes" ADD CONSTRAINT "resumes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_alerts_enhanced" ADD CONSTRAINT "job_alerts_enhanced_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences_enhanced" ADD CONSTRAINT "notification_preferences_enhanced_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_analytics" ADD CONSTRAINT "video_analytics_video_id_video_resumes_id_fk" FOREIGN KEY ("video_id") REFERENCES "video_resumes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_analytics" ADD CONSTRAINT "video_analytics_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_resumes" ADD CONSTRAINT "video_resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members_collaboration" ADD CONSTRAINT "team_members_collaboration_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members_collaboration" ADD CONSTRAINT "team_members_collaboration_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
