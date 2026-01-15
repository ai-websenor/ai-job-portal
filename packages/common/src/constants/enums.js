'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MediaType =
  exports.ModerationStatus =
  exports.PrivacySetting =
  exports.VideoStatus =
  exports.ParsingStatus =
  exports.DiversityLevel =
  exports.UserAction =
  exports.InteractionType =
  exports.DataType =
  exports.SenderType =
  exports.TicketStatus =
  exports.Priority =
  exports.PageStatus =
  exports.AdminRole =
  exports.DiscountType =
  exports.PaymentGateway =
  exports.PaymentMethod =
  exports.PaymentStatus =
  exports.BillingCycle =
  exports.SubscriptionPlan =
  exports.QueuePriority =
  exports.QueueStatus =
  exports.NotificationStatus =
  exports.NotificationFrequency =
  exports.NotificationChannel =
  exports.NotificationType =
  exports.ShareChannel =
  exports.VerificationStatus =
  exports.CompanyType =
  exports.CompanySize =
  exports.WorkShift =
  exports.DocumentType =
  exports.JobSearchStatus =
  exports.NoticePeriod =
  exports.FileType =
  exports.ProficiencyLevel =
  exports.SkillCategory =
  exports.EducationLevel =
  exports.EmploymentType =
  exports.Visibility =
  exports.InterviewMode =
  exports.InterviewRound =
  exports.InterviewStatus =
  exports.ApplicationStatus =
  exports.WorkMode =
  exports.ExperienceLevel =
  exports.JobType =
  exports.SocialProvider =
  exports.Gender =
  exports.UserRole =
    void 0;
exports.NextSteps =
  exports.InterviewRecommendation =
  exports.EntityType =
  exports.RelatedToType =
  exports.TaskStatus =
  exports.TaskPriority =
  exports.TeamRole =
  exports.BrandingTier =
  exports.Sender =
    void 0;
var UserRole;
(function (UserRole) {
  UserRole['CANDIDATE'] = 'candidate';
  UserRole['EMPLOYER'] = 'employer';
  UserRole['ADMIN'] = 'admin';
  UserRole['TEAM_MEMBER'] = 'team_member';
})(UserRole || (exports.UserRole = UserRole = {}));
var Gender;
(function (Gender) {
  Gender['MALE'] = 'male';
  Gender['FEMALE'] = 'female';
  Gender['OTHER'] = 'other';
  Gender['NOT_SPECIFIED'] = 'not_specified';
})(Gender || (exports.Gender = Gender = {}));
var SocialProvider;
(function (SocialProvider) {
  SocialProvider['GOOGLE'] = 'google';
  SocialProvider['LINKEDIN'] = 'linkedin';
})(SocialProvider || (exports.SocialProvider = SocialProvider = {}));
var JobType;
(function (JobType) {
  JobType['FULL_TIME'] = 'full_time';
  JobType['PART_TIME'] = 'part_time';
  JobType['CONTRACT'] = 'contract';
  JobType['FREELANCE'] = 'freelance';
  JobType['INTERNSHIP'] = 'internship';
  JobType['GIG'] = 'gig';
  JobType['REMOTE'] = 'remote';
})(JobType || (exports.JobType = JobType = {}));
var ExperienceLevel;
(function (ExperienceLevel) {
  ExperienceLevel['ENTRY'] = 'entry';
  ExperienceLevel['MID'] = 'mid';
  ExperienceLevel['SENIOR'] = 'senior';
  ExperienceLevel['LEAD'] = 'lead';
})(ExperienceLevel || (exports.ExperienceLevel = ExperienceLevel = {}));
var WorkMode;
(function (WorkMode) {
  WorkMode['OFFICE'] = 'office';
  WorkMode['REMOTE'] = 'remote';
  WorkMode['HYBRID'] = 'hybrid';
})(WorkMode || (exports.WorkMode = WorkMode = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
  ApplicationStatus['APPLIED'] = 'applied';
  ApplicationStatus['VIEWED'] = 'viewed';
  ApplicationStatus['SHORTLISTED'] = 'shortlisted';
  ApplicationStatus['INTERVIEW_SCHEDULED'] = 'interview_scheduled';
  ApplicationStatus['REJECTED'] = 'rejected';
  ApplicationStatus['OFFERED'] = 'offered';
  ApplicationStatus['HIRED'] = 'hired';
  ApplicationStatus['WITHDRAWN'] = 'withdrawn';
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var InterviewStatus;
(function (InterviewStatus) {
  InterviewStatus['PENDING'] = 'pending';
  InterviewStatus['SCHEDULED'] = 'scheduled';
  InterviewStatus['CONFIRMED'] = 'confirmed';
  InterviewStatus['DECLINED'] = 'declined';
  InterviewStatus['COMPLETED'] = 'completed';
  InterviewStatus['RESCHEDULED'] = 'rescheduled';
  InterviewStatus['CANCELED'] = 'canceled';
  InterviewStatus['NO_SHOW'] = 'no_show';
})(InterviewStatus || (exports.InterviewStatus = InterviewStatus = {}));
var InterviewRound;
(function (InterviewRound) {
  InterviewRound['SCREENING'] = 'screening';
  InterviewRound['TECHNICAL'] = 'technical';
  InterviewRound['HR'] = 'hr';
  InterviewRound['MANAGERIAL'] = 'managerial';
  InterviewRound['FINAL'] = 'final';
})(InterviewRound || (exports.InterviewRound = InterviewRound = {}));
var InterviewMode;
(function (InterviewMode) {
  InterviewMode['IN_PERSON'] = 'in_person';
  InterviewMode['PHONE'] = 'phone';
  InterviewMode['VIDEO'] = 'video';
})(InterviewMode || (exports.InterviewMode = InterviewMode = {}));
var Visibility;
(function (Visibility) {
  Visibility['PUBLIC'] = 'public';
  Visibility['PRIVATE'] = 'private';
  Visibility['SEMI_PRIVATE'] = 'semi_private';
})(Visibility || (exports.Visibility = Visibility = {}));
var EmploymentType;
(function (EmploymentType) {
  EmploymentType['FULL_TIME'] = 'full_time';
  EmploymentType['PART_TIME'] = 'part_time';
  EmploymentType['CONTRACT'] = 'contract';
  EmploymentType['INTERNSHIP'] = 'internship';
  EmploymentType['FREELANCE'] = 'freelance';
})(EmploymentType || (exports.EmploymentType = EmploymentType = {}));
var EducationLevel;
(function (EducationLevel) {
  EducationLevel['HIGH_SCHOOL'] = 'high_school';
  EducationLevel['BACHELORS'] = 'bachelors';
  EducationLevel['MASTERS'] = 'masters';
  EducationLevel['PHD'] = 'phd';
  EducationLevel['DIPLOMA'] = 'diploma';
  EducationLevel['CERTIFICATE'] = 'certificate';
})(EducationLevel || (exports.EducationLevel = EducationLevel = {}));
var SkillCategory;
(function (SkillCategory) {
  SkillCategory['TECHNICAL'] = 'technical';
  SkillCategory['SOFT'] = 'soft';
  SkillCategory['LANGUAGE'] = 'language';
  SkillCategory['INDUSTRY_SPECIFIC'] = 'industry_specific';
})(SkillCategory || (exports.SkillCategory = SkillCategory = {}));
var ProficiencyLevel;
(function (ProficiencyLevel) {
  ProficiencyLevel['BEGINNER'] = 'beginner';
  ProficiencyLevel['INTERMEDIATE'] = 'intermediate';
  ProficiencyLevel['ADVANCED'] = 'advanced';
  ProficiencyLevel['EXPERT'] = 'expert';
})(ProficiencyLevel || (exports.ProficiencyLevel = ProficiencyLevel = {}));
var FileType;
(function (FileType) {
  FileType['PDF'] = 'pdf';
  FileType['DOC'] = 'doc';
  FileType['DOCX'] = 'docx';
})(FileType || (exports.FileType = FileType = {}));
var NoticePeriod;
(function (NoticePeriod) {
  NoticePeriod['IMMEDIATE'] = 'immediate';
  NoticePeriod['FIFTEEN_DAYS'] = '15_days';
  NoticePeriod['ONE_MONTH'] = '1_month';
  NoticePeriod['TWO_MONTHS'] = '2_months';
  NoticePeriod['THREE_MONTHS'] = '3_months';
})(NoticePeriod || (exports.NoticePeriod = NoticePeriod = {}));
var JobSearchStatus;
(function (JobSearchStatus) {
  JobSearchStatus['ACTIVELY_LOOKING'] = 'actively_looking';
  JobSearchStatus['OPEN_TO_OPPORTUNITIES'] = 'open_to_opportunities';
  JobSearchStatus['NOT_LOOKING'] = 'not_looking';
})(JobSearchStatus || (exports.JobSearchStatus = JobSearchStatus = {}));
var DocumentType;
(function (DocumentType) {
  DocumentType['RESUME'] = 'resume';
  DocumentType['COVER_LETTER'] = 'cover_letter';
  DocumentType['CERTIFICATE'] = 'certificate';
  DocumentType['ID_PROOF'] = 'id_proof';
  DocumentType['PORTFOLIO'] = 'portfolio';
  DocumentType['OTHER'] = 'other';
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var WorkShift;
(function (WorkShift) {
  WorkShift['DAY'] = 'day';
  WorkShift['NIGHT'] = 'night';
  WorkShift['ROTATIONAL'] = 'rotational';
  WorkShift['FLEXIBLE'] = 'flexible';
})(WorkShift || (exports.WorkShift = WorkShift = {}));
var CompanySize;
(function (CompanySize) {
  CompanySize['TINY'] = '1-10';
  CompanySize['SMALL'] = '11-50';
  CompanySize['MEDIUM'] = '51-200';
  CompanySize['LARGE'] = '201-500';
  CompanySize['ENTERPRISE'] = '500+';
})(CompanySize || (exports.CompanySize = CompanySize = {}));
var CompanyType;
(function (CompanyType) {
  CompanyType['STARTUP'] = 'startup';
  CompanyType['SME'] = 'sme';
  CompanyType['MNC'] = 'mnc';
  CompanyType['GOVERNMENT'] = 'government';
})(CompanyType || (exports.CompanyType = CompanyType = {}));
var VerificationStatus;
(function (VerificationStatus) {
  VerificationStatus['PENDING'] = 'pending';
  VerificationStatus['VERIFIED'] = 'verified';
  VerificationStatus['REJECTED'] = 'rejected';
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var ShareChannel;
(function (ShareChannel) {
  ShareChannel['WHATSAPP'] = 'whatsapp';
  ShareChannel['EMAIL'] = 'email';
  ShareChannel['LINKEDIN'] = 'linkedin';
  ShareChannel['TWITTER'] = 'twitter';
  ShareChannel['FACEBOOK'] = 'facebook';
  ShareChannel['COPY_LINK'] = 'copy_link';
})(ShareChannel || (exports.ShareChannel = ShareChannel = {}));
var NotificationType;
(function (NotificationType) {
  NotificationType['JOB_ALERT'] = 'job_alert';
  NotificationType['APPLICATION_UPDATE'] = 'application_update';
  NotificationType['INTERVIEW'] = 'interview';
  NotificationType['MESSAGE'] = 'message';
  NotificationType['SYSTEM'] = 'system';
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
  NotificationChannel['EMAIL'] = 'email';
  NotificationChannel['SMS'] = 'sms';
  NotificationChannel['WHATSAPP'] = 'whatsapp';
  NotificationChannel['PUSH'] = 'push';
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationFrequency;
(function (NotificationFrequency) {
  NotificationFrequency['INSTANT'] = 'instant';
  NotificationFrequency['HOURLY'] = 'hourly';
  NotificationFrequency['DAILY'] = 'daily';
  NotificationFrequency['WEEKLY'] = 'weekly';
})(NotificationFrequency || (exports.NotificationFrequency = NotificationFrequency = {}));
var NotificationStatus;
(function (NotificationStatus) {
  NotificationStatus['PENDING'] = 'pending';
  NotificationStatus['SENT'] = 'sent';
  NotificationStatus['DELIVERED'] = 'delivered';
  NotificationStatus['FAILED'] = 'failed';
  NotificationStatus['BOUNCED'] = 'bounced';
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var QueueStatus;
(function (QueueStatus) {
  QueueStatus['QUEUED'] = 'queued';
  QueueStatus['PROCESSING'] = 'processing';
  QueueStatus['SENT'] = 'sent';
  QueueStatus['FAILED'] = 'failed';
})(QueueStatus || (exports.QueueStatus = QueueStatus = {}));
var QueuePriority;
(function (QueuePriority) {
  QueuePriority['HIGH'] = 'high';
  QueuePriority['MEDIUM'] = 'medium';
  QueuePriority['LOW'] = 'low';
})(QueuePriority || (exports.QueuePriority = QueuePriority = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
  SubscriptionPlan['FREE'] = 'free';
  SubscriptionPlan['BASIC'] = 'basic';
  SubscriptionPlan['PREMIUM'] = 'premium';
  SubscriptionPlan['ENTERPRISE'] = 'enterprise';
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var BillingCycle;
(function (BillingCycle) {
  BillingCycle['ONE_TIME'] = 'one_time';
  BillingCycle['MONTHLY'] = 'monthly';
  BillingCycle['QUARTERLY'] = 'quarterly';
  BillingCycle['YEARLY'] = 'yearly';
})(BillingCycle || (exports.BillingCycle = BillingCycle = {}));
var PaymentStatus;
(function (PaymentStatus) {
  PaymentStatus['PENDING'] = 'pending';
  PaymentStatus['SUCCESS'] = 'success';
  PaymentStatus['FAILED'] = 'failed';
  PaymentStatus['REFUNDED'] = 'refunded';
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
  PaymentMethod['CREDIT_CARD'] = 'credit_card';
  PaymentMethod['DEBIT_CARD'] = 'debit_card';
  PaymentMethod['UPI'] = 'upi';
  PaymentMethod['NETBANKING'] = 'netbanking';
  PaymentMethod['WALLET'] = 'wallet';
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentGateway;
(function (PaymentGateway) {
  PaymentGateway['RAZORPAY'] = 'razorpay';
  PaymentGateway['STRIPE'] = 'stripe';
})(PaymentGateway || (exports.PaymentGateway = PaymentGateway = {}));
var DiscountType;
(function (DiscountType) {
  DiscountType['PERCENTAGE'] = 'percentage';
  DiscountType['FIXED'] = 'fixed';
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var AdminRole;
(function (AdminRole) {
  AdminRole['SUPER_ADMIN'] = 'super_admin';
  AdminRole['ADMIN'] = 'admin';
  AdminRole['MODERATOR'] = 'moderator';
  AdminRole['SUPPORT'] = 'support';
})(AdminRole || (exports.AdminRole = AdminRole = {}));
var PageStatus;
(function (PageStatus) {
  PageStatus['DRAFT'] = 'draft';
  PageStatus['PUBLISHED'] = 'published';
})(PageStatus || (exports.PageStatus = PageStatus = {}));
var Priority;
(function (Priority) {
  Priority['LOW'] = 'low';
  Priority['MEDIUM'] = 'medium';
  Priority['HIGH'] = 'high';
  Priority['URGENT'] = 'urgent';
})(Priority || (exports.Priority = Priority = {}));
var TicketStatus;
(function (TicketStatus) {
  TicketStatus['OPEN'] = 'open';
  TicketStatus['IN_PROGRESS'] = 'in_progress';
  TicketStatus['RESOLVED'] = 'resolved';
  TicketStatus['CLOSED'] = 'closed';
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var SenderType;
(function (SenderType) {
  SenderType['USER'] = 'user';
  SenderType['ADMIN'] = 'admin';
})(SenderType || (exports.SenderType = SenderType = {}));
var DataType;
(function (DataType) {
  DataType['STRING'] = 'string';
  DataType['NUMBER'] = 'number';
  DataType['BOOLEAN'] = 'boolean';
  DataType['JSON'] = 'json';
})(DataType || (exports.DataType = DataType = {}));
var InteractionType;
(function (InteractionType) {
  InteractionType['VIEW'] = 'view';
  InteractionType['APPLY'] = 'apply';
  InteractionType['SAVE'] = 'save';
  InteractionType['SHARE'] = 'share';
  InteractionType['NOT_INTERESTED'] = 'not_interested';
})(InteractionType || (exports.InteractionType = InteractionType = {}));
var UserAction;
(function (UserAction) {
  UserAction['VIEWED'] = 'viewed';
  UserAction['APPLIED'] = 'applied';
  UserAction['SAVED'] = 'saved';
  UserAction['IGNORED'] = 'ignored';
  UserAction['NOT_INTERESTED'] = 'not_interested';
})(UserAction || (exports.UserAction = UserAction = {}));
var DiversityLevel;
(function (DiversityLevel) {
  DiversityLevel['LOW'] = 'low';
  DiversityLevel['MEDIUM'] = 'medium';
  DiversityLevel['HIGH'] = 'high';
})(DiversityLevel || (exports.DiversityLevel = DiversityLevel = {}));
var ParsingStatus;
(function (ParsingStatus) {
  ParsingStatus['PENDING'] = 'pending';
  ParsingStatus['PROCESSING'] = 'processing';
  ParsingStatus['COMPLETED'] = 'completed';
  ParsingStatus['FAILED'] = 'failed';
})(ParsingStatus || (exports.ParsingStatus = ParsingStatus = {}));
var VideoStatus;
(function (VideoStatus) {
  VideoStatus['UPLOADING'] = 'uploading';
  VideoStatus['PROCESSING'] = 'processing';
  VideoStatus['APPROVED'] = 'approved';
  VideoStatus['REJECTED'] = 'rejected';
  VideoStatus['ACTIVE'] = 'active';
})(VideoStatus || (exports.VideoStatus = VideoStatus = {}));
var PrivacySetting;
(function (PrivacySetting) {
  PrivacySetting['PUBLIC'] = 'public';
  PrivacySetting['EMPLOYERS_ONLY'] = 'employers_only';
  PrivacySetting['PRIVATE'] = 'private';
})(PrivacySetting || (exports.PrivacySetting = PrivacySetting = {}));
var ModerationStatus;
(function (ModerationStatus) {
  ModerationStatus['PENDING'] = 'pending';
  ModerationStatus['APPROVED'] = 'approved';
  ModerationStatus['REJECTED'] = 'rejected';
})(ModerationStatus || (exports.ModerationStatus = ModerationStatus = {}));
var MediaType;
(function (MediaType) {
  MediaType['PHOTO'] = 'photo';
  MediaType['VIDEO'] = 'video';
})(MediaType || (exports.MediaType = MediaType = {}));
var Sender;
(function (Sender) {
  Sender['USER'] = 'user';
  Sender['BOT'] = 'bot';
  Sender['AGENT'] = 'agent';
})(Sender || (exports.Sender = Sender = {}));
var BrandingTier;
(function (BrandingTier) {
  BrandingTier['FREE'] = 'free';
  BrandingTier['PREMIUM'] = 'premium';
  BrandingTier['ENTERPRISE'] = 'enterprise';
})(BrandingTier || (exports.BrandingTier = BrandingTier = {}));
var TeamRole;
(function (TeamRole) {
  TeamRole['ADMIN'] = 'admin';
  TeamRole['RECRUITER'] = 'recruiter';
  TeamRole['HIRING_MANAGER'] = 'hiring_manager';
  TeamRole['INTERVIEWER'] = 'interviewer';
  TeamRole['VIEWER'] = 'viewer';
})(TeamRole || (exports.TeamRole = TeamRole = {}));
var TaskPriority;
(function (TaskPriority) {
  TaskPriority['HIGH'] = 'high';
  TaskPriority['MEDIUM'] = 'medium';
  TaskPriority['LOW'] = 'low';
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
var TaskStatus;
(function (TaskStatus) {
  TaskStatus['OPEN'] = 'open';
  TaskStatus['IN_PROGRESS'] = 'in_progress';
  TaskStatus['COMPLETED'] = 'completed';
  TaskStatus['CANCELED'] = 'canceled';
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var RelatedToType;
(function (RelatedToType) {
  RelatedToType['JOB'] = 'job';
  RelatedToType['CANDIDATE'] = 'candidate';
  RelatedToType['INTERVIEW'] = 'interview';
})(RelatedToType || (exports.RelatedToType = RelatedToType = {}));
var EntityType;
(function (EntityType) {
  EntityType['CANDIDATE'] = 'candidate';
  EntityType['JOB'] = 'job';
  EntityType['TASK'] = 'task';
  EntityType['NOTE'] = 'note';
})(EntityType || (exports.EntityType = EntityType = {}));
var InterviewRecommendation;
(function (InterviewRecommendation) {
  InterviewRecommendation['STRONG_YES'] = 'strong_yes';
  InterviewRecommendation['YES'] = 'yes';
  InterviewRecommendation['MAYBE'] = 'maybe';
  InterviewRecommendation['NO'] = 'no';
  InterviewRecommendation['STRONG_NO'] = 'strong_no';
})(InterviewRecommendation || (exports.InterviewRecommendation = InterviewRecommendation = {}));
var NextSteps;
(function (NextSteps) {
  NextSteps['NEXT_ROUND'] = 'next_round';
  NextSteps['REJECT'] = 'reject';
  NextSteps['HOLD'] = 'hold';
})(NextSteps || (exports.NextSteps = NextSteps = {}));
//# sourceMappingURL=enums.js.map
