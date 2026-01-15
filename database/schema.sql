-- AI Job Portal Database Schema
-- PostgreSQL 15+
-- Generated from DATABASE.md documentation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User & Auth
CREATE TYPE user_role AS ENUM ('candidate', 'employer', 'admin', 'team_member');
CREATE TYPE social_provider AS ENUM ('google', 'linkedin');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'not_specified');

-- Profile
CREATE TYPE visibility_type AS ENUM ('public', 'private', 'semi_private');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'freelance');
CREATE TYPE education_level AS ENUM ('high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate');
CREATE TYPE proficiency_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE notice_period AS ENUM ('immediate', '15_days', '1_month', '2_months', '3_months');
CREATE TYPE work_shift AS ENUM ('day', 'night', 'rotational', 'flexible');
CREATE TYPE job_search_status AS ENUM ('actively_looking', 'open_to_opportunities', 'not_looking');
CREATE TYPE document_type AS ENUM ('resume', 'cover_letter', 'certificate', 'id_proof', 'portfolio', 'other');
CREATE TYPE file_type AS ENUM ('pdf', 'doc', 'docx');

-- Company
CREATE TYPE company_size AS ENUM ('1-10', '11-50', '51-200', '201-500', '500+');
CREATE TYPE company_type AS ENUM ('startup', 'sme', 'mnc', 'government');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium', 'enterprise');

-- Job & Application
CREATE TYPE application_status AS ENUM ('applied', 'viewed', 'shortlisted', 'interview_scheduled', 'rejected', 'hired', 'withdrawn', 'offer_accepted', 'offer_rejected');
CREATE TYPE interview_status AS ENUM ('scheduled', 'confirmed', 'completed', 'rescheduled', 'canceled', 'no_show');
CREATE TYPE share_channel AS ENUM ('whatsapp', 'email', 'linkedin', 'twitter', 'facebook', 'copy_link');

-- Notification
CREATE TYPE notification_type AS ENUM ('job_alert', 'application_update', 'interview', 'message', 'system');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp', 'push');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
CREATE TYPE alert_frequency AS ENUM ('instant', 'hourly', 'daily', 'weekly');
CREATE TYPE priority_type AS ENUM ('high', 'medium', 'low');

-- Payment
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'upi', 'netbanking', 'wallet');
CREATE TYPE billing_cycle AS ENUM ('one_time', 'monthly', 'quarterly', 'yearly');

-- Admin
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator', 'support');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE page_status AS ENUM ('draft', 'published');
CREATE TYPE setting_data_type AS ENUM ('string', 'number', 'boolean', 'json');

-- AI/ML
CREATE TYPE interaction_type AS ENUM ('view', 'apply', 'save', 'share', 'not_interested');
CREATE TYPE user_action AS ENUM ('viewed', 'applied', 'saved', 'ignored', 'not_interested');
CREATE TYPE diversity_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE branding_tier AS ENUM ('free', 'premium', 'enterprise');

-- =====================================================
-- DOMAIN 1: USER AUTHENTICATION
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    mobile VARCHAR(20),
    role user_role NOT NULL DEFAULT 'candidate',
    is_verified BOOLEAN DEFAULT FALSE,
    is_mobile_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    resume_details JSONB,
    onboarding_step INTEGER DEFAULT 0,
    is_onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE social_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider social_provider NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE,
    refresh_token VARCHAR(500) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    used_at TIMESTAMP
);

-- =====================================================
-- DOMAIN 2: JOB SEEKER PROFILES
-- =====================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender gender_type,
    phone VARCHAR(20),
    email VARCHAR(255),
    alternate_phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pin_code VARCHAR(20),
    profile_photo VARCHAR(500),
    professional_summary TEXT,
    total_experience_years DECIMAL(4,2),
    visibility visibility_type DEFAULT 'public',
    is_profile_complete BOOLEAN DEFAULT FALSE,
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE work_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    employment_type employment_type,
    location VARCHAR(255),
    is_current BOOLEAN DEFAULT FALSE,
    duration VARCHAR(100),
    is_fresher BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    description TEXT,
    achievements TEXT,
    skills_used TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE education_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level education_level,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    grade VARCHAR(50),
    honors TEXT,
    relevant_coursework TEXT,
    currently_studying BOOLEAN DEFAULT FALSE,
    certificate_url VARCHAR(500),
    description TEXT,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level proficiency_level,
    years_of_experience DECIMAL(4,1),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(profile_id, skill_id)
);

CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_id VARCHAR(255),
    credential_url VARCHAR(500),
    certificate_file VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type file_type,
    resume_name VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    is_built_with_builder BOOLEAN DEFAULT FALSE,
    template_id UUID,
    parsed_content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_types TEXT,
    preferred_locations TEXT,
    willing_to_relocate BOOLEAN DEFAULT FALSE,
    expected_salary_min DECIMAL(10,2),
    expected_salary_max DECIMAL(10,2),
    salary_currency VARCHAR(10) DEFAULT 'INR',
    expected_salary DECIMAL(10,2),
    notice_period notice_period,
    preferred_industries TEXT,
    work_shift work_shift,
    job_search_status job_search_status,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    source VARCHAR(100)
);

-- =====================================================
-- DOMAIN 3: EMPLOYER & COMPANY
-- =====================================================

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    industry VARCHAR(100),
    company_size company_size,
    year_established INTEGER,
    company_type company_type,
    website VARCHAR(500),
    description TEXT,
    mission TEXT,
    culture TEXT,
    benefits TEXT,
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    tagline VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status verification_status DEFAULT 'pending',
    verification_documents TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE employers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    company_logo VARCHAR(500),
    website VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    subscription_plan subscription_plan DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50),
    permissions TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DOMAIN 4: JOB POSTING
-- =====================================================

CREATE TABLE job_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER,
    is_discoverable BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES job_categories(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    job_type VARCHAR(50),
    work_type VARCHAR(50),
    experience_level VARCHAR(100),
    location VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    salary_min INTEGER,
    salary_max INTEGER,
    pay_rate VARCHAR(50),
    show_salary BOOLEAN DEFAULT TRUE,
    skills TEXT[],
    category_id UUID REFERENCES job_categories(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    trending_score INTEGER,
    popularity_score INTEGER,
    relevance_score INTEGER,
    last_activity_at TIMESTAMP,
    deadline TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_highlighted BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_state_city ON jobs(state, city);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
CREATE INDEX idx_jobs_experience ON jobs(experience_level);
CREATE INDEX idx_jobs_is_active ON jobs(is_active);

CREATE TABLE screening_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(20),
    options TEXT[],
    is_required BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_category_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES job_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, category_id)
);

CREATE TABLE saved_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    job_seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, job_seeker_id)
);

CREATE TABLE job_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_seeker_id UUID,
    keywords TEXT[],
    location VARCHAR(255),
    job_type TEXT[],
    salary_min INTEGER,
    salary_max INTEGER,
    frequency VARCHAR(20) DEFAULT 'instant',
    is_active BOOLEAN DEFAULT TRUE,
    last_sent TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_job_views_user_time ON job_views(user_id, viewed_at);
CREATE INDEX idx_job_views_job ON job_views(job_id);

CREATE TABLE job_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    job_type VARCHAR(50),
    experience_level VARCHAR(100),
    searched_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_search_history_user_time ON job_search_history(user_id, searched_at);

CREATE TABLE job_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    score INTEGER,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_recommendations_user_score ON job_recommendations(user_id, score);

CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    search_criteria TEXT,
    alert_enabled BOOLEAN DEFAULT TRUE,
    alert_frequency VARCHAR(20) DEFAULT 'daily',
    alert_channels TEXT,
    last_alert_sent TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    share_channel share_channel,
    shared_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DOMAIN 5: APPLICATIONS
-- =====================================================

CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    job_seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status application_status DEFAULT 'applied',
    cover_letter TEXT,
    resume_url VARCHAR(500),
    resume_snapshot JSONB,
    screening_answers JSONB,
    rating INTEGER,
    notes TEXT,
    status_history JSONB DEFAULT '[]',
    applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, job_seeker_id)
);

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    interview_type VARCHAR(50),
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 60,
    location VARCHAR(255),
    interviewer_notes TEXT,
    candidate_feedback TEXT,
    status interview_status DEFAULT 'scheduled',
    calendar_event_id VARCHAR(255),
    reminder_sent TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE application_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    changed_by UUID,
    previous_status application_status,
    new_status application_status,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE applicant_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE applicant_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID,
    tag VARCHAR(100),
    color VARCHAR(20),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DOMAIN 6: NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_alerts BOOLEAN DEFAULT TRUE,
    application_updates BOOLEAN DEFAULT TRUE,
    interview_reminders BOOLEAN DEFAULT TRUE,
    messages BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50),
    channel notification_channel NOT NULL,
    recipient VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    error_message TEXT,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50),
    channel notification_channel NOT NULL,
    priority priority_type DEFAULT 'medium',
    scheduled_for TIMESTAMP,
    payload TEXT,
    status notification_status DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE TABLE job_alerts_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    search_criteria TEXT,
    frequency alert_frequency DEFAULT 'daily',
    channels TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DOMAIN 7: PAYMENTS
-- =====================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status payment_status DEFAULT 'pending',
    payment_method payment_method,
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(255),
    gateway_order_id VARCHAR(255),
    gateway_payment_id VARCHAR(255),
    invoice_number VARCHAR(50),
    invoice_url VARCHAR(500),
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    job_posting_limit INTEGER DEFAULT 1,
    job_posting_used INTEGER DEFAULT 0,
    featured_jobs_limit INTEGER DEFAULT 0,
    featured_jobs_used INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    status payment_status,
    message TEXT,
    gateway_response TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE,
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',
    invoice_url VARCHAR(500),
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DOMAIN 8: ADMIN
-- =====================================================

CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role admin_role NOT NULL,
    permissions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    action VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    changes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cms_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    status page_status DEFAULT 'draft',
    published_at TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    billing_cycle billing_cycle,
    features TEXT,
    job_post_limit INTEGER,
    resume_access_limit INTEGER,
    featured_jobs INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2),
    min_purchase_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    applicable_plans TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    assigned_to UUID REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20),
    sender_id UUID,
    message TEXT,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    data_type setting_data_type,
    category VARCHAR(100),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES admin_users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DOMAIN 9: ANALYTICS & BRANDING
-- =====================================================

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_name VARCHAR(100),
    event_properties TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE TABLE metric_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100),
    metric_value TEXT,
    period VARCHAR(50),
    calculated_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE company_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID,
    slug VARCHAR(255) UNIQUE,
    hero_banner_url VARCHAR(500),
    tagline VARCHAR(255),
    about TEXT,
    mission TEXT,
    culture TEXT,
    benefits TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    branding_tier branding_tier DEFAULT 'free',
    custom_domain VARCHAR(255),
    custom_colors TEXT,
    seo_title VARCHAR(100),
    seo_description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE company_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID,
    media_type VARCHAR(20),
    media_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    category VARCHAR(100),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID,
    employee_name VARCHAR(255),
    job_title VARCHAR(255),
    photo_url VARCHAR(500),
    testimonial TEXT,
    video_url VARCHAR(500),
    is_approved BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100),
    currency_code VARCHAR(3),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    settings TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE regional_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    price DECIMAL(10,2),
    currency VARCHAR(3),
    effective_from DATE,
    effective_to DATE
);

-- =====================================================
-- DOMAIN 10: AI/ML
-- =====================================================

CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interaction_type interaction_type NOT NULL,
    match_score DECIMAL(5,2),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    session_id VARCHAR(100),
    metadata TEXT
);

CREATE TABLE recommendation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2),
    recommendation_reason TEXT,
    algorithm_version VARCHAR(50),
    user_action user_action,
    position_in_list INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    actioned_at TIMESTAMP
);

CREATE TABLE user_job_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_types TEXT,
    locations TEXT,
    salary_min DECIMAL(10,2),
    salary_max DECIMAL(10,2),
    industries TEXT,
    excluded_companies TEXT,
    expected_salary DECIMAL(10,2),
    diversity_level diversity_level DEFAULT 'medium',
    notification_enabled BOOLEAN DEFAULT TRUE,
    min_match_score_for_notification INTEGER DEFAULT 85,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    algorithm_type VARCHAR(100),
    parameters TEXT,
    performance_metrics TEXT,
    training_date TIMESTAMP,
    deployment_date TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE parsed_resume_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    personal_info TEXT,
    work_experiences TEXT,
    education TEXT,
    skills TEXT,
    certifications TEXT,
    projects TEXT,
    confidence_scores TEXT,
    raw_text TEXT,
    parsed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE resume_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    quality_score DECIMAL(5,2),
    quality_breakdown TEXT,
    ats_score DECIMAL(5,2),
    ats_issues TEXT,
    suggestions TEXT,
    keyword_matches TEXT,
    analyzed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SUMMARY
-- =====================================================
-- Total Tables: 54
-- Domains: 10
--
-- Domain 1 (Auth): 6 tables
-- Domain 2 (Profiles): 10 tables
-- Domain 3 (Employer): 3 tables
-- Domain 4 (Jobs): 11 tables
-- Domain 5 (Applications): 5 tables
-- Domain 6 (Notifications): 5 tables
-- Domain 7 (Payments): 4 tables
-- Domain 8 (Admin): 8 tables
-- Domain 9 (Analytics): 6 tables
-- Domain 10 (AI/ML): 6 tables
