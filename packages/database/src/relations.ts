import { relations } from 'drizzle-orm';

// Auth
import { users, adminUsers, sessions, socialLogins, emailVerifications, otps, passwordResets } from './schema/auth';

// Profiles
import {
  jobSeekers,
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
  userJobPreferences,
} from './schema/profiles';

// Employer
import { companies, employers, teamMembers, teamMembersCollaboration, companyPages, companyMedia, employeeTestimonials } from './schema/employer';

// Jobs
import { jobCategories, jobCategoriesAdmin, jobs, jobCategoryRelations, screeningQuestions, savedJobs, savedSearches, jobAlerts, jobAlertsEnhanced, jobViews, jobShares, jobSearchHistory } from './schema/jobs';

// Applications
import { jobApplications, applicationHistory, applicantNotes, applicantTags, interviews, interviewFeedback } from './schema/applications';

// Resume
import { resumes, resumeTemplates, parsedResumeData, resumeAnalysis, videoResumes, videoAnalytics } from './schema/resume';

// Notifications
import { notifications, notificationPreferences, notificationPreferencesEnhanced, notificationQueue, notificationLogs, emailTemplates, smsTemplates, whatsappTemplates } from './schema/notifications';

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

export const usersRelations = relations(users, ({ one, many }) => ({
  // Profile relations
  jobSeeker: one(jobSeekers),
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
  notificationPreferences: one(notificationPreferences),
  notificationPreferencesEnhanced: one(notificationPreferencesEnhanced),
  savedJobs: many(savedJobs),
  savedSearches: many(savedSearches),
  jobAlerts: many(jobAlerts),
  payments: many(payments),
  videoResumes: many(videoResumes),

  // AI relations
  jobRecommendations: many(jobRecommendations),
  userInteractions: many(userInteractions),
}));

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

export const jobSeekersRelations = relations(jobSeekers, ({ one }) => ({
  user: one(users, {
    fields: [jobSeekers.userId],
    references: [users.id],
  }),
}));

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

export const workExperiencesRelations = relations(workExperiences, ({ one }) => ({
  profile: one(profiles, {
    fields: [workExperiences.profileId],
    references: [profiles.id],
  }),
}));

export const educationRecordsRelations = relations(educationRecords, ({ one }) => ({
  profile: one(profiles, {
    fields: [educationRecords.profileId],
    references: [profiles.id],
  }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  profile: one(profiles, {
    fields: [certifications.profileId],
    references: [profiles.id],
  }),
}));

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

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  employer: one(employers, {
    fields: [teamMembers.employerId],
    references: [employers.id],
  }),
}));

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

export const jobCategoriesRelations = relations(jobCategories, ({ one, many }) => ({
  parent: one(jobCategories, {
    fields: [jobCategories.parentId],
    references: [jobCategories.id],
  }),
  children: many(jobCategories),
  jobs: many(jobCategoryRelations),
}));

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

export const screeningQuestionsRelations = relations(screeningQuestions, ({ one }) => ({
  job: one(jobs, {
    fields: [screeningQuestions.jobId],
    references: [jobs.id],
  }),
}));

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

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  application: one(jobApplications, {
    fields: [interviews.applicationId],
    references: [jobApplications.id],
  }),
  feedback: many(interviewFeedback),
}));

export const interviewFeedbackRelations = relations(interviewFeedback, ({ one }) => ({
  interview: one(interviews, {
    fields: [interviewFeedback.interviewId],
    references: [interviews.id],
  }),
}));

// ============================================================
// Resume Relations
// ============================================================

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

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
  regionalPricing: many(regionalPricing),
}));

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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ============================================================
// Messaging Relations
// ============================================================

export const messageThreadsRelations = relations(messageThreads, ({ many }) => ({
  messages: many(messages),
}));

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

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// ============================================================
// Admin Relations
// ============================================================

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

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
}));

// ============================================================
// AI Relations
// ============================================================

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
