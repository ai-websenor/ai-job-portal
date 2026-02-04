// Enums (must be first for dependencies)
export * from './enums';

// Domain 1: Auth (7 tables)
export * from './auth';

// Domain 1.1: RBAC (4 tables)
export * from './rbac';

// Domain 1.2: Audit (1 table)
export * from './audit';

// Domain 2: Profiles (15 tables)
export * from './profiles';

// Domain 3: Employer (7 tables)
export * from './employer';

// Domain 4: Jobs (12 tables)
export * from './jobs';

// Domain 5: Applications (6 tables)
export * from './applications';

// Domain 6: Resume (6 tables)
export * from './resume';

// Domain 7: Notifications (8 tables)
export * from './notifications';

// Domain 8: Payments (9 tables)
export * from './payments';

// Domain 9: Admin & CMS (13 tables)
export * from './admin';

// Domain 10: Messaging (4 tables)
export * from './messaging';

// Domain 11: Analytics (3 tables)
export * from './analytics';

// Domain 12: AI/ML (4 tables)
export * from './ai';

// ============================================================
// DEPRECATED - Backward Compatibility Aliases
// These aliases are for gradual migration from old schema names
// Remove after all services have been updated
// ============================================================

import { profiles, educationRecords, jobPreferences } from './profiles';
import { employers, teamMembersCollaboration } from './employer';
import { jobApplications } from './applications';
import { workExperiences } from './profiles';
import { screeningQuestions, jobCategories, savedSearches } from './jobs';
import { socialLogins } from './auth';
import { notificationPreferencesEnhanced } from './notifications';

// Profile aliases
/** @deprecated Use `profiles` instead */
export { profiles as candidateProfiles };
/** @deprecated Use `profiles` instead */
export { profiles as jobSeekers };

// Employer aliases
/** @deprecated Use `employers` instead */
export { employers as employerProfiles };

// Application aliases
/** @deprecated Use `jobApplications` instead */
export { jobApplications as applications };

// Profile detail aliases
/** @deprecated Use `workExperiences` instead */
export { workExperiences as candidateExperiences };

/** @deprecated Use `educationRecords` instead */
export { educationRecords as candidateEducation };
/** @deprecated Use `educationRecords` instead */
export { educationRecords as education };

/** @deprecated Use `jobPreferences` instead */
export { jobPreferences as userJobPreferences };

// Job aliases
/** @deprecated Use `screeningQuestions` instead */
export { screeningQuestions as jobQuestions };

/** @deprecated Use `jobCategories` instead */
export { jobCategories as jobCategoriesAdmin };

/** @deprecated Use `savedSearches` instead */
export { savedSearches as jobAlerts };
/** @deprecated Use `savedSearches` instead */
export { savedSearches as jobAlertsEnhanced };

// Notification aliases
/** @deprecated Use `notificationPreferencesEnhanced` instead */
export { notificationPreferencesEnhanced as notificationPreferences };

// Team aliases
/** @deprecated Use `teamMembersCollaboration` instead */
export { teamMembersCollaboration as teamMembers };

// Auth aliases
/** @deprecated Use `socialLogins` instead */
export { socialLogins as socialAccounts };
