import { pgEnum } from 'drizzle-orm/pg-core';

// User & Auth
export const userRoleEnum = pgEnum('user_role', ['candidate', 'employer', 'admin', 'team_member']);
export const socialProviderEnum = pgEnum('social_provider', ['google', 'linkedin']);
export const verificationTypeEnum = pgEnum('verification_type', ['email', 'phone', 'password_reset', 'two_factor']);

// Profile
export const profileVisibilityEnum = pgEnum('profile_visibility', ['public', 'private', 'employers_only']);
export const skillProficiencyEnum = pgEnum('skill_proficiency', ['beginner', 'intermediate', 'advanced', 'expert']);

// Employment
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract', 'internship', 'freelance']);
export const workModeEnum = pgEnum('work_mode', ['remote', 'onsite', 'hybrid']);
export const experienceLevelEnum = pgEnum('experience_level', ['entry', 'mid', 'senior', 'lead', 'executive']);

// Job
export const jobStatusEnum = pgEnum('job_status', ['draft', 'pending', 'active', 'paused', 'closed', 'expired']);

// Application
export const applicationStatusEnum = pgEnum('application_status', [
  'pending', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn'
]);
export const interviewStatusEnum = pgEnum('interview_status', [
  'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'
]);
export const interviewTypeEnum = pgEnum('interview_type', ['phone', 'video', 'in_person', 'technical', 'hr', 'final']);
export const offerStatusEnum = pgEnum('offer_status', ['pending', 'accepted', 'declined', 'expired', 'withdrawn']);

// Notification
export const notificationTypeEnum = pgEnum('notification_type', ['application', 'interview', 'job', 'message', 'system']);
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'push', 'in_app']);
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'delivered', 'failed']);

// Payment
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'expired', 'paused']);
export const paymentProviderEnum = pgEnum('payment_provider', ['razorpay', 'stripe']);

// Admin
export const contentStatusEnum = pgEnum('content_status', ['draft', 'published', 'archived']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'investigating', 'resolved', 'dismissed']);
export const reportTypeEnum = pgEnum('report_type', ['job', 'user', 'company', 'content']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete', 'login', 'logout', 'export']);

// AI/ML
export const matchStatusEnum = pgEnum('match_status', ['pending', 'accepted', 'rejected', 'expired']);
export const recommendationTypeEnum = pgEnum('recommendation_type', ['job', 'candidate', 'skill', 'course']);
