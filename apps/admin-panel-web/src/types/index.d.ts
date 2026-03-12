// User and Authentication Types
export interface IUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Admin Types
export interface IAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleId?: string;
  companyId?: string;
  employer?: {
    id: string;
    companyId?: string;
    company?: {
      id: string;
      name: string;
      slug?: string;
    };
  };
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Role and Permission Types
export interface IPermission {
  id: string;
  name: string;
  description: string;
  module?: string;
}

export interface IRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isCustom: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Member Types
export interface IMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  invitedAt?: string;
  lastActive?: string;
  avatar?: string;
}

// Employer Types
export interface IEmployer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  isActive: boolean;
  isVerified: boolean;
  designation?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

// Candidate Types
export interface ICandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
  skills?: string[];
  experience?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

// Company Types
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';
export type CompanyType = 'startup' | 'sme' | 'mnc' | 'government';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface ICompany {
  isActive: boolean;
  id: string;
  userId?: string;
  name: string;
  slug?: string;
  industry?: string;
  companySize?: CompanySize;
  companyType?: CompanyType;
  yearEstablished?: number;
  website?: string;
  description?: string;
  mission?: string;
  culture?: string;
  benefits?: string;
  logoUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  headquarters?: string;
  employeeCount?: number;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  panNumber?: string;
  gstNumber?: string;
  cinNumber?: string;
  kycDocuments?: boolean;
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  verificationDocuments?: string;
  createdAt: string;
  updatedAt: string;
}

// Post Types
export interface IPost {
  id: string;
  title: string;
  content: string;
  author: IUser;
  authorId: string;
  category: string;
  tags?: string[];
  status: 'published' | 'draft' | 'archived' | 'flagged';
  createdAt: string;
  updatedAt: string;
  views?: number;
  likes?: number;
}

// Moderation Types
export interface IFlaggedPost {
  id: string;
  postId: string;
  title: string;
  content: string;
  author: string;
  authorEmail: string;
  authorId: string;
  flaggedBy: string;
  flaggedById: string;
  flaggedReason: string;
  flaggedAt: Date | string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  category: string;
  reviewedBy?: string;
  reviewedAt?: Date | string;
  reviewNotes?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Dashboard Stats Types
export interface IDashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalMembers: number;
  pendingModeration: number;
  activeUsers: number;
  userGrowth?: number;
  postGrowth?: number;
}

// Analytics Types
export interface IAnalytics {
  date: string;
  users: number;
  posts: number;
  engagement: number;
}

// Table Types
export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableAction<T = unknown> {
  label: string;
  onClick: (row: T) => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: unknown;
}

// Resume Template Types
export type TemplateLevel = 'fresher' | 'mid' | 'experienced';

export interface IResumeTemplate {
  id: string;
  name: string;
  templateType?: string;
  templateLevel?: TemplateLevel;
  thumbnailUrl?: string;
  templateHtml: string;
  templateCss?: string;
  isPremium: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

// Skill Types
export type SkillType = 'master-typed' | 'user-typed';

export type SkillCategory = 'technical' | 'soft' | 'language' | 'industry_specific';

export interface ISkill {
  id: string;
  name: string;
  type: SkillType;
  category: SkillCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Education Master Data Types
export type EducationLevel =
  | 'high_school'
  | 'bachelors'
  | 'masters'
  | 'phd'
  | 'diploma'
  | 'certificate';

export type MasterDataType = 'master-typed' | 'user-typed';

export interface IMasterDegree {
  id: string;
  name: string;
  level: EducationLevel;
  type: MasterDataType;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface IMasterFieldOfStudy {
  id: string;
  degreeId: string;
  name: string;
  type: MasterDataType;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Video Resume Types
export type VideoModerationStatus = 'pending' | 'approved' | 'rejected';

export interface IVideoResume {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  videoResumeUrl: string;
  videoUrl?: string;
  videoProfileStatus: VideoModerationStatus | null;
  videoRejectionReason: string | null;
  videoUploadedAt: string | null;
}

// Avatar Types
export type AvatarGender = 'male' | 'female' | 'other';

export interface IAvatar {
  id: string;
  name: string;
  imageUrl: string;
  gender: AvatarGender;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
}

// Job Filter Option Types
export type FilterGroup =
  | 'job_type'
  | 'experience_level'
  | 'work_mode'
  | 'location_type'
  | 'pay_rate'
  | 'posted_within'
  | 'salary_range'
  | 'company_type'
  | 'industry'
  | 'department'
  | 'sort_by';

export interface IFilterOption {
  id: string;
  group: FilterGroup;
  label: string;
  value: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
}

// Subscription Types
export type BillingCycle = 'one_time' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'expired';

export interface ISubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  features: string[];
  jobPostLimit: number;
  resumeAccessLimit: number;
  featuredJobs: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ISubscription {
  id: string;
  employerId: string;
  plan: string;
  planId: string;
  billingCycle: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  jobPostingLimit: number;
  jobPostingUsed: number;
  featuredJobsLimit: number;
  featuredJobsUsed: number;
  resumeAccessLimit: number;
  resumeAccessUsed: number;
  highlightedJobsLimit: number;
  highlightedJobsUsed: number;
  isActive: boolean;
  canceledAt?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt?: string;
  employer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  subscriptionPlan?: ISubscriptionPlan;
}
