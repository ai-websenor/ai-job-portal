import { relations } from 'drizzle-orm';

// Auth
import { users, adminUsers, sessions, socialLogins, emailVerifications, otps, passwordResets } from './schema/auth';

// Profiles
import {
  profiles,
  workExperiences,
  educationRecords,
  certifications,
  skills,
  profileSkills,
  languages,
  profileLanguages,
  profileProjects,
  jobPreferences,
  profileDocuments,
  profileViews,
  userPreferences,
} from './schema/profiles';

// Employer
import { companies, employers, teamMembersCollaboration, companyPages, companyMedia, employeeTestimonials } from './schema/employer';

// Jobs
import { jobCategories, jobs, jobCategoryRelations, screeningQuestions, savedJobs, savedSearches, jobViews, jobShares, jobSearchHistory } from './schema/jobs';

// Applications
import { jobApplications, applicationHistory, applicantNotes, applicantTags, interviews, interviewFeedback } from './schema/applications';

// Resume
import { resumes, resumeTemplates, parsedResumeData, resumeAnalysis, videoResumes, videoAnalytics } from './schema/resume';

// Notifications
import { notifications, notificationPreferencesEnhanced, notificationQueue, notificationLogs, emailTemplates, smsTemplates, whatsappTemplates } from './schema/notifications';

// Payments
import { subscriptionPlans, subscriptions, payments, invoices, refunds, discountCodes, regions, regionalPricing, transactionHistory } from './schema/payments';

// Admin
import { cmsPages, blogPosts, announcements, banners, adminActivityLog, platformSettings, tasks, comments, reportedContent, supportTickets, ticketMessages } from './schema/admin';

// Messaging
import { messageThreads, messages, chatSessions, chatMessages } from './schema/messaging';

// Analytics
import { activityLogs, analyticsEvents, metricCache } from './schema/analytics';

// AI
import { jobRecommendations, recommendationLogs, userInteractions, mlModels } from './schema/ai';

// ============================================================
// User Relations
// ============================================================

/**
 * Users - central entity for candidates and employers
 *
 * @example Get user with their profile
 * ```ts
 * db.query.users.findFirst({
 *   where: eq(users.email, 'priya@gmail.com'),
 *   with: { profile: true }
 * })
 * ```
 *
 * @relationships
 * - user 1:1 profile (candidate details - only if role=candidate)
 * - user 1:1 employer (employer account - only if role=employer)
 * - user 1:N sessions (active login sessions)
 * - user 1:N socialLogins (Google, LinkedIn OAuth connections)
 * - user 1:N emailVerifications (email verify tokens)
 * - user 1:N otps (mobile OTP codes)
 * - user 1:N passwordResets (reset tokens)
 * - user 1:N notifications (in-app notifications)
 * - user 1:1 notificationPreferencesEnhanced (email/push/sms preferences)
 * - user 1:N savedJobs (bookmarked job listings)
 * - user 1:N savedSearches (saved job search filters)
 * - user 1:N payments (payment transactions)
 * - user 1:N videoResumes (video introductions)
 * - user 1:N jobRecommendations (AI-suggested jobs)
 * - user 1:N userInteractions (click/view/apply tracking for ML)
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  // Profile relations
  profile: one(profiles),
  employer: one(employers),

  // Auth relations
  sessions: many(sessions),
  socialLogins: many(socialLogins),
  emailVerifications: many(emailVerifications),
  otps: many(otps),
  passwordResets: many(passwordResets),

  // Feature relations
  notifications: many(notifications),
  notificationPreferencesEnhanced: one(notificationPreferencesEnhanced),
  savedJobs: many(savedJobs),
  savedSearches: many(savedSearches),
  payments: many(payments),
  videoResumes: many(videoResumes),

  // AI relations
  jobRecommendations: many(jobRecommendations),
  userInteractions: many(userInteractions),
}));

/**
 * Admin users - platform administrators
 *
 * @example Get admin with their activity
 * ```ts
 * db.query.adminUsers.findFirst({
 *   where: eq(adminUsers.id, adminId),
 *   with: { activityLogs: { limit: 10 } }
 * })
 * ```
 *
 * @relationships
 * - admin 1:N activityLogs (audit trail of admin actions)
 * - admin 1:N cmsPages (pages created by this admin)
 * - admin 1:N blogPosts (articles authored)
 * - admin 1:N discountCodes (promo codes created)
 * - admin 1:N refundsProcessed (refunds they approved)
 */
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  activityLogs: many(adminActivityLog),
  cmsPages: many(cmsPages),
  blogPosts: many(blogPosts),
  discountCodes: many(discountCodes),
  refundsProcessed: many(refunds),
}));

// ============================================================
// Profile Relations
// ============================================================

/**
 * Profiles - candidate details (work history, skills, education)
 *
 * @example Get profile with work experience
 * ```ts
 * db.query.profiles.findFirst({
 *   where: eq(profiles.userId, userId),
 *   with: { workExperiences: true, profileSkills: true }
 * })
 * ```
 *
 * @relationships
 * - profile N:1 user (belongs to one user account)
 * - profile 1:N resumes (uploaded resume files)
 * - profile 1:N workExperiences (job history entries)
 * - profile 1:N educationRecords (degrees, colleges)
 * - profile 1:N certifications (AWS, PMP, etc.)
 * - profile 1:N profileSkills (skills with experience years - junction to skills)
 * - profile 1:N profileLanguages (languages spoken - junction to languages)
 * - profile 1:N profileProjects (portfolio projects)
 * - profile 1:1 jobPreferences (desired salary, location, job type)
 * - profile 1:N profileDocuments (ID proofs, certificates)
 * - profile 1:N profileViews (employers who viewed this profile)
 */
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  resumes: many(resumes),
  workExperiences: many(workExperiences),
  educationRecords: many(educationRecords),
  certifications: many(certifications),
  profileSkills: many(profileSkills),
  profileLanguages: many(profileLanguages),
  profileProjects: many(profileProjects),
  jobPreferences: one(jobPreferences),
  profileDocuments: many(profileDocuments),
  profileViews: many(profileViews),
}));

/**
 * @relationships
 * - workExperience N:1 profile (belongs to candidate profile)
 */
export const workExperiencesRelations = relations(workExperiences, ({ one }) => ({
  profile: one(profiles, {
    fields: [workExperiences.profileId],
    references: [profiles.id],
  }),
}));

/**
 * @relationships
 * - educationRecord N:1 profile (belongs to candidate profile)
 */
export const educationRecordsRelations = relations(educationRecords, ({ one }) => ({
  profile: one(profiles, {
    fields: [educationRecords.profileId],
    references: [profiles.id],
  }),
}));

/**
 * @relationships
 * - certification N:1 profile (belongs to candidate profile)
 */
export const certificationsRelations = relations(certifications, ({ one }) => ({
  profile: one(profiles, {
    fields: [certifications.profileId],
    references: [profiles.id],
  }),
}));

/**
 * ProfileSkills - junction table linking profiles to skills
 *
 * @example Get profile skills with skill details
 * ```ts
 * db.query.profileSkills.findMany({
 *   where: eq(profileSkills.profileId, profileId),
 *   with: { skill: true }
 * })
 * // Returns: [{ yearsOfExperience: 3, skill: { name: 'React' } }]
 * ```
 *
 * @relationships
 * - profileSkill N:1 profile (belongs to profile)
 * - profileSkill N:1 skill (links to skill master)
 */
export const profileSkillsRelations = relations(profileSkills, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileSkills.profileId],
    references: [profiles.id],
  }),
  skill: one(skills, {
    fields: [profileSkills.skillId],
    references: [skills.id],
  }),
}));

// ============================================================
// Employer Relations
// ============================================================

/**
 * Companies - organization profiles (Infosys, TCS, etc.)
 *
 * @example Get company with active jobs
 * ```ts
 * db.query.companies.findFirst({
 *   where: eq(companies.slug, 'infosys'),
 *   with: { jobs: true }
 * })
 * ```
 *
 * @relationships
 * - company N:1 user (the user who created/owns this company profile)
 * - company 1:N employers (HR users linked to this company with subscriptions)
 * - company 1:N jobs (job postings by this company)
 * - company 1:N teamMembersCollaboration (invited recruiters, hiring managers)
 * - company 1:1 companyPages (branded career page with custom styling)
 * - company 1:N companyMedia (photos, videos of office/culture)
 * - company 1:N employeeTestimonials (employee reviews for branding)
 */
export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, {
    fields: [companies.userId],
    references: [users.id],
  }),
  employers: many(employers),
  jobs: many(jobs),
  teamMembersCollaboration: many(teamMembersCollaboration),
  companyPages: one(companyPages),
  companyMedia: many(companyMedia),
  employeeTestimonials: many(employeeTestimonials),
}));

/**
 * Employers - links user account to company with subscription info
 *
 * @example Get employer with company details
 * ```ts
 * db.query.employers.findFirst({
 *   where: eq(employers.userId, userId),
 *   with: { company: true }
 * })
 * // Returns: { subscriptionPlan: 'premium', company: { name: 'Infosys' } }
 * ```
 *
 * @relationships
 * - employer N:1 user (user account)
 * - employer N:1 company (works at this company)
 * - employer 1:N subscriptions (billing history)
 */
export const employersRelations = relations(employers, ({ one, many }) => ({
  user: one(users, {
    fields: [employers.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [employers.companyId],
    references: [companies.id],
  }),
  subscriptions: many(subscriptions),
}));

/**
 * TeamMembers - invited collaborators (recruiters, hiring managers)
 *
 * @example Get team members for a company
 * ```ts
 * db.query.teamMembersCollaboration.findMany({
 *   where: eq(teamMembersCollaboration.companyId, companyId),
 *   with: { user: true }
 * })
 * // Returns: [{ role: 'recruiter', user: { firstName: 'Rahul' } }]
 * ```
 *
 * @relationships
 * - teamMember N:1 user (the invited user's account)
 * - teamMember N:1 company (which company they collaborate on)
 * - teamMember N:1 invitedBy (user who sent the invitation)
 */
export const teamMembersCollaborationRelations = relations(teamMembersCollaboration, ({ one }) => ({
  user: one(users, {
    fields: [teamMembersCollaboration.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [teamMembersCollaboration.companyId],
    references: [companies.id],
  }),
  invitedBy: one(users, {
    fields: [teamMembersCollaboration.invitedBy],
    references: [users.id],
  }),
}));

// ============================================================
// Job Relations
// ============================================================

/**
 * JobCategories - hierarchical job categories (IT > Frontend > React)
 *
 * @example Get category with subcategories
 * ```ts
 * db.query.jobCategories.findFirst({
 *   where: eq(jobCategories.slug, 'it-software'),
 *   with: { children: true }
 * })
 * ```
 *
 * @relationships
 * - category N:1 parent (parent category - self-referential)
 * - category 1:N children (subcategories under this category)
 * - category 1:N jobs (jobs tagged with this category via junction)
 */
export const jobCategoriesRelations = relations(jobCategories, ({ one, many }) => ({
  parent: one(jobCategories, {
    fields: [jobCategories.parentId],
    references: [jobCategories.id],
  }),
  children: many(jobCategories),
  jobs: many(jobCategoryRelations),
}));

/**
 * Jobs - job postings by employers
 *
 * @example Get job with employer info
 * ```ts
 * db.query.jobs.findFirst({
 *   where: eq(jobs.id, jobId),
 *   with: { employer: { with: { company: true } } }
 * })
 * // Returns: { title: 'React Dev', employer: { company: { name: 'Infosys' } } }
 * ```
 *
 * @relationships
 * - job N:1 employer (posted by this employer)
 * - job N:1 category (primary job category)
 * - job 1:N categories (additional categories via junction)
 * - job 1:N screeningQuestions (application screening questions)
 * - job 1:N applications (candidate applications)
 * - job 1:N views (view tracking for analytics)
 * - job 1:N shares (social media shares)
 * - job 1:N savedBy (candidates who bookmarked this job)
 * - job 1:N recommendations (AI recommendations to users)
 */
export const jobsRelations = relations(jobs, ({ one, many }) => ({
  employer: one(employers, {
    fields: [jobs.employerId],
    references: [employers.id],
  }),
  category: one(jobCategories, {
    fields: [jobs.categoryId],
    references: [jobCategories.id],
  }),
  categories: many(jobCategoryRelations),
  screeningQuestions: many(screeningQuestions),
  applications: many(jobApplications),
  views: many(jobViews),
  shares: many(jobShares),
  savedBy: many(savedJobs),
  recommendations: many(jobRecommendations),
}));

/**
 * @relationships
 * - screeningQuestion N:1 job (belongs to job posting)
 */
export const screeningQuestionsRelations = relations(screeningQuestions, ({ one }) => ({
  job: one(jobs, {
    fields: [screeningQuestions.jobId],
    references: [jobs.id],
  }),
}));

/**
 * SavedJobs - bookmarked jobs by candidates
 *
 * @example Get user's saved jobs
 * ```ts
 * db.query.savedJobs.findMany({
 *   where: eq(savedJobs.jobSeekerId, userId),
 *   with: { job: true }
 * })
 * ```
 *
 * @relationships
 * - savedJob N:1 jobSeeker (user who saved)
 * - savedJob N:1 job (the saved job listing)
 */
export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  jobSeeker: one(users, {
    fields: [savedJobs.jobSeekerId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [savedJobs.jobId],
    references: [jobs.id],
  }),
}));

// ============================================================
// Application Relations
// ============================================================

/**
 * JobApplications - candidate applications to jobs
 *
 * @example Get application with job and candidate
 * ```ts
 * db.query.jobApplications.findFirst({
 *   where: eq(jobApplications.id, appId),
 *   with: { job: true, jobSeeker: true }
 * })
 * // Returns: { status: 'shortlisted', job: {...}, jobSeeker: {...} }
 * ```
 *
 * @relationships
 * - application N:1 job (which job applied to)
 * - application N:1 jobSeeker (candidate who applied)
 * - application 1:N history (status change log)
 * - application 1:N interviews (scheduled interviews)
 * - application 1:N notes (recruiter notes on candidate)
 * - application 1:N tags (labels like 'strong', 'backup')
 */
export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
  job: one(jobs, {
    fields: [jobApplications.jobId],
    references: [jobs.id],
  }),
  jobSeeker: one(users, {
    fields: [jobApplications.jobSeekerId],
    references: [users.id],
  }),
  history: many(applicationHistory),
  interviews: many(interviews),
  notes: many(applicantNotes),
  tags: many(applicantTags),
}));

/**
 * Interviews - scheduled interviews for applications
 *
 * @example Get interview with feedback
 * ```ts
 * db.query.interviews.findFirst({
 *   where: eq(interviews.id, interviewId),
 *   with: { feedback: true, application: true }
 * })
 * ```
 *
 * @relationships
 * - interview N:1 application (for which application)
 * - interview 1:N feedback (interviewer feedback entries)
 */
export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  application: one(jobApplications, {
    fields: [interviews.applicationId],
    references: [jobApplications.id],
  }),
  feedback: many(interviewFeedback),
}));

/**
 * @relationships
 * - feedback N:1 interview (belongs to interview)
 */
export const interviewFeedbackRelations = relations(interviewFeedback, ({ one }) => ({
  interview: one(interviews, {
    fields: [interviewFeedback.interviewId],
    references: [interviews.id],
  }),
}));

/**
 * @relationships
 * - history N:1 application (belongs to application)
 */
export const applicationHistoryRelations = relations(applicationHistory, ({ one }) => ({
  application: one(jobApplications, {
    fields: [applicationHistory.applicationId],
    references: [jobApplications.id],
  }),
}));

/**
 * @relationships
 * - note N:1 application (belongs to application)
 * - note N:1 author (written by user)
 */
export const applicantNotesRelations = relations(applicantNotes, ({ one }) => ({
  application: one(jobApplications, {
    fields: [applicantNotes.applicationId],
    references: [jobApplications.id],
  }),
  author: one(users, {
    fields: [applicantNotes.authorId],
    references: [users.id],
  }),
}));

/**
 * @relationships
 * - tag N:1 application (belongs to application)
 */
export const applicantTagsRelations = relations(applicantTags, ({ one }) => ({
  application: one(jobApplications, {
    fields: [applicantTags.applicationId],
    references: [jobApplications.id],
  }),
}));

// ============================================================
// Resume Relations
// ============================================================

/**
 * Resumes - uploaded/generated resume files
 *
 * @example Get resume with AI analysis
 * ```ts
 * db.query.resumes.findFirst({
 *   where: eq(resumes.profileId, profileId),
 *   with: { parsedData: true, analysis: true }
 * })
 * // Returns: { fileName: 'cv.pdf', analysis: { atsScore: 85 } }
 * ```
 *
 * @relationships
 * - resume N:1 profile (belongs to candidate profile)
 * - resume N:1 template (built with this resume template)
 * - resume 1:1 parsedData (AI-extracted skills, experience)
 * - resume 1:1 analysis (ATS score, improvement suggestions)
 * - resume 1:N applications (applications using this resume)
 */
export const resumesRelations = relations(resumes, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [resumes.profileId],
    references: [profiles.id],
  }),
  template: one(resumeTemplates, {
    fields: [resumes.templateId],
    references: [resumeTemplates.id],
  }),
  parsedData: one(parsedResumeData),
  analysis: one(resumeAnalysis),
  applications: many(jobApplications),
}));

/**
 * VideoResumes - video introductions by candidates
 *
 * @example Get video resume with view analytics
 * ```ts
 * db.query.videoResumes.findFirst({
 *   where: eq(videoResumes.userId, userId),
 *   with: { analytics: true }
 * })
 * ```
 *
 * @relationships
 * - videoResume N:1 user (uploaded by this user)
 * - videoResume 1:N analytics (view count, watch time tracking)
 */
export const videoResumesRelations = relations(videoResumes, ({ one, many }) => ({
  user: one(users, {
    fields: [videoResumes.userId],
    references: [users.id],
  }),
  analytics: many(videoAnalytics),
}));

// ============================================================
// Payment Relations
// ============================================================

/**
 * SubscriptionPlans - available plans (Free, Premium, Enterprise)
 *
 * @example Get plan with regional pricing
 * ```ts
 * db.query.subscriptionPlans.findFirst({
 *   where: eq(subscriptionPlans.name, 'premium'),
 *   with: { regionalPricing: true }
 * })
 * ```
 *
 * @relationships
 * - plan 1:N subscriptions (employers subscribed to this plan)
 * - plan 1:N regionalPricing (price per region - India, US, etc.)
 */
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
  regionalPricing: many(regionalPricing),
}));

/**
 * Subscriptions - employer subscription records
 *
 * @example Get subscription with payment history
 * ```ts
 * db.query.subscriptions.findFirst({
 *   where: eq(subscriptions.employerId, empId),
 *   with: { plan: true, payments: true }
 * })
 * // Returns: { status: 'active', plan: { name: 'premium' }, payments: [...] }
 * ```
 *
 * @relationships
 * - subscription N:1 employer, plan
 * - subscription 1:N payments
 */
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  employer: one(employers, {
    fields: [subscriptions.employerId],
    references: [employers.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  payments: many(payments),
}));

/**
 * Payments - transaction records
 *
 * @example Get payment with invoice
 * ```ts
 * db.query.payments.findFirst({
 *   where: eq(payments.id, paymentId),
 *   with: { invoices: true, subscription: true }
 * })
 * ```
 *
 * @relationships
 * - payment N:1 user (who paid)
 * - payment N:1 subscription (for which subscription)
 * - payment N:1 discountCode (coupon applied, if any)
 * - payment 1:N invoices (GST invoices generated)
 * - payment 1:N refunds (refund requests)
 * - payment 1:N transactionHistory (payment gateway events)
 */
export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
  discountCode: one(discountCodes, {
    fields: [payments.discountCodeId],
    references: [discountCodes.id],
  }),
  invoices: many(invoices),
  refunds: many(refunds),
  transactionHistory: many(transactionHistory),
}));

/**
 * @relationships
 * - invoice N:1 payment (generated for this payment)
 * - invoice N:1 user (billed to this user)
 */
export const invoicesRelations = relations(invoices, ({ one }) => ({
  payment: one(payments, {
    fields: [invoices.paymentId],
    references: [payments.id],
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
}));

/**
 * @relationships
 * - refund N:1 payment (refund for this payment)
 * - refund N:1 user (refund requested by)
 * - refund N:1 processedBy (admin who approved/rejected)
 */
export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
  user: one(users, {
    fields: [refunds.userId],
    references: [users.id],
  }),
  processedBy: one(adminUsers, {
    fields: [refunds.processedBy],
    references: [adminUsers.id],
  }),
}));

// ============================================================
// Notification Relations
// ============================================================

/**
 * @relationships
 * - notification N:1 user (sent to this user)
 */
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ============================================================
// Messaging Relations
// ============================================================

/**
 * MessageThreads - conversation between candidate and employer
 *
 * @example Get thread with recent messages
 * ```ts
 * db.query.messageThreads.findFirst({
 *   where: eq(messageThreads.id, threadId),
 *   with: { messages: { limit: 20 } }
 * })
 * ```
 *
 * @relationships
 * - thread 1:N messages (messages in this conversation)
 */
export const messageThreadsRelations = relations(messageThreads, ({ many }) => ({
  messages: many(messages),
}));

/**
 * @relationships
 * - message N:1 thread (belongs to conversation)
 * - message N:1 sender (user who sent)
 * - message N:1 recipient (user who received)
 */
export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(messageThreads, {
    fields: [messages.threadId],
    references: [messageThreads.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
  }),
}));

/**
 * ChatSessions - chatbot conversations
 *
 * @example Get chat session with messages
 * ```ts
 * db.query.chatSessions.findFirst({
 *   where: eq(chatSessions.id, sessionId),
 *   with: { messages: true, user: true }
 * })
 * ```
 *
 * @relationships
 * - chatSession N:1 user (user chatting with bot)
 * - chatSession 1:N messages (chat messages in session)
 */
export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

/**
 * @relationships
 * - chatMessage N:1 session (belongs to chat session)
 */
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// ============================================================
// Admin Relations
// ============================================================

/**
 * SupportTickets - customer support tickets
 *
 * @example Get ticket with messages
 * ```ts
 * db.query.supportTickets.findFirst({
 *   where: eq(supportTickets.ticketNumber, 'TKT-2025-001'),
 *   with: { messages: true, user: true }
 * })
 * ```
 *
 * @relationships
 * - ticket N:1 user (user who raised ticket)
 * - ticket N:1 assignedTo (admin handling ticket)
 * - ticket 1:N messages (conversation in ticket)
 */
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  assignedTo: one(adminUsers, {
    fields: [supportTickets.assignedTo],
    references: [adminUsers.id],
  }),
  messages: many(ticketMessages),
}));

/**
 * @relationships
 * - ticketMessage N:1 ticket (belongs to support ticket)
 */
export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
}));

// ============================================================
// AI Relations
// ============================================================

/**
 * JobRecommendations - AI-suggested jobs for candidates
 *
 * @example Get recommendations for a user
 * ```ts
 * db.query.jobRecommendations.findMany({
 *   where: eq(jobRecommendations.userId, userId),
 *   with: { job: true },
 *   orderBy: desc(jobRecommendations.score),
 *   limit: 10
 * })
 * // Returns: [{ score: 92, reason: 'Skills match', job: {...} }]
 * ```
 *
 * @relationships
 * - recommendation N:1 user (recommended to this candidate)
 * - recommendation N:1 job (the recommended job)
 */
export const jobRecommendationsRelations = relations(jobRecommendations, ({ one }) => ({
  user: one(users, {
    fields: [jobRecommendations.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [jobRecommendations.jobId],
    references: [jobs.id],
  }),
}));

/**
 * UserInteractions - tracks user-job interactions for ML training
 *
 * @example Get recent interactions
 * ```ts
 * db.query.userInteractions.findMany({
 *   where: eq(userInteractions.userId, userId),
 *   with: { job: true }
 * })
 * // Returns: [{ interactionType: 'view', job: {...} }]
 * ```
 *
 * @relationships
 * - interaction N:1 user (which user interacted)
 * - interaction N:1 job (which job they viewed/saved/applied)
 */
export const userInteractionsRelations = relations(userInteractions, ({ one }) => ({
  user: one(users, {
    fields: [userInteractions.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [userInteractions.jobId],
    references: [jobs.id],
  }),
}));
