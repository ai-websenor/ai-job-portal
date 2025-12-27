export declare enum UserRole {
    CANDIDATE = "candidate",
    EMPLOYER = "employer",
    ADMIN = "admin",
    TEAM_MEMBER = "team_member"
}
export declare enum Gender {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other",
    NOT_SPECIFIED = "not_specified"
}
export declare enum SocialProvider {
    GOOGLE = "google",
    LINKEDIN = "linkedin"
}
export declare enum JobType {
    FULL_TIME = "full_time",
    PART_TIME = "part_time",
    CONTRACT = "contract",
    FREELANCE = "freelance",
    INTERNSHIP = "internship",
    GIG = "gig",
    REMOTE = "remote"
}
export declare enum ExperienceLevel {
    ENTRY = "entry",
    MID = "mid",
    SENIOR = "senior",
    LEAD = "lead"
}
export declare enum WorkMode {
    OFFICE = "office",
    REMOTE = "remote",
    HYBRID = "hybrid"
}
export declare enum ApplicationStatus {
    APPLIED = "applied",
    VIEWED = "viewed",
    SHORTLISTED = "shortlisted",
    INTERVIEW_SCHEDULED = "interview_scheduled",
    REJECTED = "rejected",
    OFFERED = "offered",
    HIRED = "hired",
    WITHDRAWN = "withdrawn"
}
export declare enum InterviewStatus {
    PENDING = "pending",
    SCHEDULED = "scheduled",
    CONFIRMED = "confirmed",
    DECLINED = "declined",
    COMPLETED = "completed",
    RESCHEDULED = "rescheduled",
    CANCELED = "canceled",
    NO_SHOW = "no_show"
}
export declare enum InterviewRound {
    SCREENING = "screening",
    TECHNICAL = "technical",
    HR = "hr",
    MANAGERIAL = "managerial",
    FINAL = "final"
}
export declare enum InterviewMode {
    IN_PERSON = "in_person",
    PHONE = "phone",
    VIDEO = "video"
}
export declare enum Visibility {
    PUBLIC = "public",
    PRIVATE = "private",
    SEMI_PRIVATE = "semi_private"
}
export declare enum EmploymentType {
    FULL_TIME = "full_time",
    PART_TIME = "part_time",
    CONTRACT = "contract",
    INTERNSHIP = "internship",
    FREELANCE = "freelance"
}
export declare enum EducationLevel {
    HIGH_SCHOOL = "high_school",
    BACHELORS = "bachelors",
    MASTERS = "masters",
    PHD = "phd",
    DIPLOMA = "diploma",
    CERTIFICATE = "certificate"
}
export declare enum SkillCategory {
    TECHNICAL = "technical",
    SOFT = "soft",
    LANGUAGE = "language",
    INDUSTRY_SPECIFIC = "industry_specific"
}
export declare enum ProficiencyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced",
    EXPERT = "expert"
}
export declare enum FileType {
    PDF = "pdf",
    DOC = "doc",
    DOCX = "docx"
}
export declare enum NoticePeriod {
    IMMEDIATE = "immediate",
    FIFTEEN_DAYS = "15_days",
    ONE_MONTH = "1_month",
    TWO_MONTHS = "2_months",
    THREE_MONTHS = "3_months"
}
export declare enum JobSearchStatus {
    ACTIVELY_LOOKING = "actively_looking",
    OPEN_TO_OPPORTUNITIES = "open_to_opportunities",
    NOT_LOOKING = "not_looking"
}
export declare enum DocumentType {
    RESUME = "resume",
    COVER_LETTER = "cover_letter",
    CERTIFICATE = "certificate",
    ID_PROOF = "id_proof",
    PORTFOLIO = "portfolio",
    OTHER = "other"
}
export declare enum WorkShift {
    DAY = "day",
    NIGHT = "night",
    ROTATIONAL = "rotational",
    FLEXIBLE = "flexible"
}
export declare enum CompanySize {
    TINY = "1-10",
    SMALL = "11-50",
    MEDIUM = "51-200",
    LARGE = "201-500",
    ENTERPRISE = "500+"
}
export declare enum CompanyType {
    STARTUP = "startup",
    SME = "sme",
    MNC = "mnc",
    GOVERNMENT = "government"
}
export declare enum VerificationStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    REJECTED = "rejected"
}
export declare enum ShareChannel {
    WHATSAPP = "whatsapp",
    EMAIL = "email",
    LINKEDIN = "linkedin",
    TWITTER = "twitter",
    FACEBOOK = "facebook",
    COPY_LINK = "copy_link"
}
export declare enum NotificationType {
    JOB_ALERT = "job_alert",
    APPLICATION_UPDATE = "application_update",
    INTERVIEW = "interview",
    MESSAGE = "message",
    SYSTEM = "system"
}
export declare enum NotificationChannel {
    EMAIL = "email",
    SMS = "sms",
    WHATSAPP = "whatsapp",
    PUSH = "push"
}
export declare enum NotificationFrequency {
    INSTANT = "instant",
    HOURLY = "hourly",
    DAILY = "daily",
    WEEKLY = "weekly"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    SENT = "sent",
    DELIVERED = "delivered",
    FAILED = "failed",
    BOUNCED = "bounced"
}
export declare enum QueueStatus {
    QUEUED = "queued",
    PROCESSING = "processing",
    SENT = "sent",
    FAILED = "failed"
}
export declare enum QueuePriority {
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare enum SubscriptionPlan {
    FREE = "free",
    BASIC = "basic",
    PREMIUM = "premium",
    ENTERPRISE = "enterprise"
}
export declare enum BillingCycle {
    ONE_TIME = "one_time",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum PaymentMethod {
    CREDIT_CARD = "credit_card",
    DEBIT_CARD = "debit_card",
    UPI = "upi",
    NETBANKING = "netbanking",
    WALLET = "wallet"
}
export declare enum PaymentGateway {
    RAZORPAY = "razorpay",
    STRIPE = "stripe"
}
export declare enum DiscountType {
    PERCENTAGE = "percentage",
    FIXED = "fixed"
}
export declare enum AdminRole {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    MODERATOR = "moderator",
    SUPPORT = "support"
}
export declare enum PageStatus {
    DRAFT = "draft",
    PUBLISHED = "published"
}
export declare enum Priority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export declare enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare enum SenderType {
    USER = "user",
    ADMIN = "admin"
}
export declare enum DataType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    JSON = "json"
}
export declare enum InteractionType {
    VIEW = "view",
    APPLY = "apply",
    SAVE = "save",
    SHARE = "share",
    NOT_INTERESTED = "not_interested"
}
export declare enum UserAction {
    VIEWED = "viewed",
    APPLIED = "applied",
    SAVED = "saved",
    IGNORED = "ignored",
    NOT_INTERESTED = "not_interested"
}
export declare enum DiversityLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high"
}
export declare enum ParsingStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare enum VideoStatus {
    UPLOADING = "uploading",
    PROCESSING = "processing",
    APPROVED = "approved",
    REJECTED = "rejected",
    ACTIVE = "active"
}
export declare enum PrivacySetting {
    PUBLIC = "public",
    EMPLOYERS_ONLY = "employers_only",
    PRIVATE = "private"
}
export declare enum ModerationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare enum MediaType {
    PHOTO = "photo",
    VIDEO = "video"
}
export declare enum Sender {
    USER = "user",
    BOT = "bot",
    AGENT = "agent"
}
export declare enum BrandingTier {
    FREE = "free",
    PREMIUM = "premium",
    ENTERPRISE = "enterprise"
}
export declare enum TeamRole {
    ADMIN = "admin",
    RECRUITER = "recruiter",
    HIRING_MANAGER = "hiring_manager",
    INTERVIEWER = "interviewer",
    VIEWER = "viewer"
}
export declare enum TaskPriority {
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare enum TaskStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELED = "canceled"
}
export declare enum RelatedToType {
    JOB = "job",
    CANDIDATE = "candidate",
    INTERVIEW = "interview"
}
export declare enum EntityType {
    CANDIDATE = "candidate",
    JOB = "job",
    TASK = "task",
    NOTE = "note"
}
export declare enum InterviewRecommendation {
    STRONG_YES = "strong_yes",
    YES = "yes",
    MAYBE = "maybe",
    NO = "no",
    STRONG_NO = "strong_no"
}
export declare enum NextSteps {
    NEXT_ROUND = "next_round",
    REJECT = "reject",
    HOLD = "hold"
}
