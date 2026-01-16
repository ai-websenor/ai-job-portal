import { relations } from 'drizzle-orm';
import {
  users,
  sessions,
  socialAccounts,
  verifications,
  twoFactorSecrets,
  passwordHistory,
} from './schema/auth';
import {
  candidateProfiles,
  candidateExperiences,
  candidateEducation,
  candidateSkills,
  candidateResumes,
  candidateCertifications,
  candidateProjects,
  candidateLanguages,
  candidateSocialLinks,
  candidatePreferences,
} from './schema/profiles';
import {
  employerProfiles,
  employerTeamMembers,
  employerLocations,
} from './schema/employer';
import {
  jobs,
  jobCategories,
  skills,
  jobSkills,
  savedJobs,
  jobViews,
  jobAlerts,
} from './schema/jobs';
import {
  applications,
  applicationStatusHistory,
  interviews,
  applicationNotes,
  offers,
} from './schema/applications';
import {
  notifications,
  notificationPreferences,
} from './schema/notifications';
import {
  subscriptions,
  payments,
} from './schema/payments';

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  candidateProfile: one(candidateProfiles),
  employerProfile: one(employerProfiles),
  sessions: many(sessions),
  socialAccounts: many(socialAccounts),
  verifications: many(verifications),
  twoFactorSecret: one(twoFactorSecrets),
  passwordHistory: many(passwordHistory),
  notifications: many(notifications),
  notificationPreferences: one(notificationPreferences),
  savedJobs: many(savedJobs),
  jobAlerts: many(jobAlerts),
}));

// Candidate profile relations
export const candidateProfilesRelations = relations(candidateProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [candidateProfiles.userId],
    references: [users.id],
  }),
  experiences: many(candidateExperiences),
  education: many(candidateEducation),
  skills: many(candidateSkills),
  resumes: many(candidateResumes),
  certifications: many(candidateCertifications),
  projects: many(candidateProjects),
  languages: many(candidateLanguages),
  socialLinks: many(candidateSocialLinks),
  preferences: one(candidatePreferences),
  applications: many(applications),
}));

// Employer profile relations
export const employerProfilesRelations = relations(employerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [employerProfiles.userId],
    references: [users.id],
  }),
  teamMembers: many(employerTeamMembers),
  locations: many(employerLocations),
  jobs: many(jobs),
  subscriptions: many(subscriptions),
}));

// Job relations
export const jobsRelations = relations(jobs, ({ one, many }) => ({
  employerProfile: one(employerProfiles, {
    fields: [jobs.employerProfileId],
    references: [employerProfiles.id],
  }),
  category: one(jobCategories, {
    fields: [jobs.categoryId],
    references: [jobCategories.id],
  }),
  skills: many(jobSkills),
  applications: many(applications),
  views: many(jobViews),
  savedBy: many(savedJobs),
}));

// Application relations
export const applicationsRelations = relations(applications, ({ one, many }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  candidateProfile: one(candidateProfiles, {
    fields: [applications.candidateProfileId],
    references: [candidateProfiles.id],
  }),
  resume: one(candidateResumes, {
    fields: [applications.resumeId],
    references: [candidateResumes.id],
  }),
  statusHistory: many(applicationStatusHistory),
  interviews: many(interviews),
  notes: many(applicationNotes),
  offers: many(offers),
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Job category relations
export const jobCategoriesRelations = relations(jobCategories, ({ one, many }) => ({
  parent: one(jobCategories, {
    fields: [jobCategories.parentId],
    references: [jobCategories.id],
  }),
  children: many(jobCategories),
  jobs: many(jobs),
  skills: many(skills),
}));
