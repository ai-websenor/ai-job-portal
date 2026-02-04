import { pgEnum } from 'drizzle-orm/pg-core';

// User & Auth
export const userRoleEnum = pgEnum('user_role', ['candidate', 'employer', 'admin', 'super_admin', 'team_member']);
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin', 'moderator', 'support']);
export const socialProviderEnum = pgEnum('social_provider', ['google', 'linkedin']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'not_specified']);

// Profile & Visibility
export const visibilityEnum = pgEnum('visibility', ['public', 'private', 'semi_private']);
export const privacySettingEnum = pgEnum('privacy_setting', ['public', 'employers_only', 'private']);
export const proficiencyLevelEnum = pgEnum('proficiency_level', ['beginner', 'intermediate', 'advanced', 'expert']);
export const skillCategoryEnum = pgEnum('skill_category', ['technical', 'soft', 'language', 'industry_specific']);
export const educationLevelEnum = pgEnum('education_level', ['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate']);
export const documentTypeEnum = pgEnum('document_type', ['resume', 'cover_letter', 'certificate', 'id_proof', 'portfolio', 'other']);
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'doc', 'docx']);

// Employment & Jobs
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract', 'internship', 'freelance']);
export const workModeEnum = pgEnum('work_mode', ['on_site', 'remote', 'hybrid']);
export const workShiftEnum = pgEnum('work_shift', ['day', 'night', 'rotational', 'flexible']);
export const experienceLevelEnum = pgEnum('experience_level', ['entry', 'mid', 'senior', 'lead']);
export const jobSearchStatusEnum = pgEnum('job_search_status', ['actively_looking', 'open_to_opportunities', 'not_looking']);

// Application & Interview
export const applicationStatusEnum = pgEnum('application_status', [
  'applied', 'viewed', 'shortlisted', 'interview_scheduled', 'rejected', 'hired', 'offer_accepted', 'offer_rejected', 'withdrawn'
]);
export const interviewStatusEnum = pgEnum('interview_status', ['scheduled', 'confirmed', 'completed', 'rescheduled', 'canceled', 'no_show']);
export const interviewTypeEnum = pgEnum('interview_type_enum', ['phone', 'video', 'in_person', 'technical', 'hr', 'panel', 'assessment']);
export const recommendationTypeEnum = pgEnum('recommendation_type', ['strong_hire', 'hire', 'no_hire', 'strong_no_hire']);

// Company
export const companySizeEnum = pgEnum('company_size', ['1-10', '11-50', '51-200', '201-500', '500+']);
export const companyTypeEnum = pgEnum('company_type', ['startup', 'sme', 'mnc', 'government']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'verified', 'rejected']);
export const brandingTierEnum = pgEnum('branding_tier', ['free', 'premium', 'enterprise']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'basic', 'premium', 'enterprise']);
export const teamRoleEnum = pgEnum('team_role', ['admin', 'recruiter', 'hiring_manager', 'interviewer', 'viewer']);

// Notifications
export const notificationTypeEnum = pgEnum('notification_type', ['job_alert', 'application_update', 'interview', 'message', 'system']);
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'whatsapp', 'push']);
export const notificationChannelEnhancedEnum = pgEnum('notification_channel_enhanced', ['email', 'push', 'sms', 'whatsapp']);
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'delivered', 'failed', 'bounced']);
export const frequencyEnum = pgEnum('frequency', ['instant', 'hourly', 'daily', 'weekly']);
export const queueStatusEnum = pgEnum('queue_status', ['queued', 'processing', 'sent', 'failed']);
export const queuePriorityEnum = pgEnum('queue_priority', ['high', 'medium', 'low']);

// Payment
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['credit_card', 'debit_card', 'upi', 'netbanking', 'wallet']);
export const billingCycleEnum = pgEnum('billing_cycle', ['one_time', 'monthly', 'quarterly', 'yearly']);
export const refundStatusEnum = pgEnum('refund_status', ['pending', 'approved', 'rejected', 'processed']);
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);

// Content & Admin
export const blogStatusEnum = pgEnum('blog_status', ['draft', 'published', 'archived']);
export const pageStatusEnum = pgEnum('page_status', ['draft', 'published']);
export const reportTypeEnum = pgEnum('report_type', ['spam', 'inappropriate', 'fake', 'duplicate', 'other']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'reviewing', 'resolved', 'dismissed']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);
export const taskStatusEnum = pgEnum('task_status', ['open', 'in_progress', 'completed', 'canceled']);
export const taskPriorityEnum = pgEnum('task_priority', ['high', 'medium', 'low']);

// Video & Media
export const videoStatusEnum = pgEnum('video_status', ['uploading', 'processing', 'approved', 'rejected', 'active']);
export const moderationStatusEnum = pgEnum('moderation_status', ['pending', 'approved', 'rejected']);
export const mediaTypeEnum = pgEnum('media_type', ['photo', 'video']);

// AI/ML
export const interactionTypeEnum = pgEnum('interaction_type', ['view', 'apply', 'save', 'share', 'not_interested']);
export const userActionEnum = pgEnum('user_action', ['viewed', 'applied', 'saved', 'ignored', 'not_interested']);
export const parsingStatusEnum = pgEnum('parsing_status', ['pending', 'processing', 'completed', 'failed']);

// Messaging
export const senderEnum = pgEnum('sender', ['user', 'bot', 'agent']);
export const senderTypeEnum = pgEnum('sender_type', ['user', 'admin']);
export const shareChannelEnum = pgEnum('share_channel', ['whatsapp', 'email', 'linkedin', 'twitter', 'facebook', 'copy_link']);

// Entity & Misc
export const entityTypeEnum = pgEnum('entity_type', ['candidate', 'job', 'task', 'note']);
export const relatedToTypeEnum = pgEnum('related_to_type', ['job', 'candidate', 'interview']);
export const dataTypeEnum = pgEnum('data_type', ['string', 'number', 'boolean', 'json']);
export const diversityLevelEnum = pgEnum('diversity_level', ['low', 'medium', 'high']);
