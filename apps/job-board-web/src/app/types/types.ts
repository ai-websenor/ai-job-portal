import { Control, FieldErrors } from 'react-hook-form';
import { Roles, TemplateLevels } from './enum';

export interface IUser {
  id: string;
  userId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  profilePhoto: string;
  headline: string;
  professionalSummary: string;
  totalExperienceYears: number;
  visibility: 'public' | 'private';
  isProfileComplete: boolean;
  completionPercentage: number;
  isPromoted: boolean;
  promotionExpiresAt: string;
  profileBoostCount: number;
  videoResumeUrl: string;
  resumeUrl: string;
  createdAt: string;
  updatedAt: string;
  workExperiences: IWorkExperience[];
  educationRecords: IEducationRecord[];
  certifications: ICertification[];
  profileSkills: IProfileSkill[];
  resumes: IResume[];
  jobPreferences: IJobPreferences;
  countryCode: string;
  nationalNumber: string;
  role: Roles;
  isOnboardingCompleted: boolean;
  company: ICompany;
  designation: string;
  department: string;
  isActive: boolean;
}

export interface IWorkExperience {
  id: string;
  profileId: string;
  companyName: string;
  jobTitle: string;
  designation: string;
  employmentType: 'full-time' | 'part-time' | 'internship' | 'contract';
  location: string | null;
  isCurrent: boolean;
  isFresher: boolean;
  startDate: string;
  endDate: string | null;
  duration: string | null;
  description: string;
  achievements: string;
  skillsUsed: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface IEducationRecord {
  id: string;
  profileId: string;
  level: string | null;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  currentlyStudying: boolean;
  grade: string;
  honors: string;
  relevantCoursework: string | null;
  description: string;
  notes: string | null;
  certificateUrl: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICertification {
  id: string;
  profileId: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string;
  credentialUrl: string | null;
  certificateFile: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IProfileSkill {
  id: string;
  profileId: string;
  skillId: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'expert';
  yearsOfExperience: number;
  displayOrder: number;
  createdAt: string;
}

export interface IResume {
  id: string;
  profileId: string;
  templateId: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  resumeName: string | null;
  isDefault: boolean;
  isBuiltWithBuilder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IJobPreferences {
  id: string;
  profileId: string;
  jobTypes: string;
  preferredLocations: string;
  preferredIndustries: string;
  willingToRelocate: boolean;
  expectedSalary: number;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  salaryCurrency: string;
  workShift: 'day' | 'night' | 'flexible';
  jobSearchStatus: 'actively_looking' | 'open_to_offers' | 'not_looking';
  noticePeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStepProps {
  errors: any;
  control: any;
  refetch?: () => void;
  handleSubmit: any;
  isSubmitting?: boolean;
  setValue?: (key: string, value: any) => void;
  setActiveTab?: (key: string) => void;
  reset?: () => void;
}

export interface ICompany {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface IJobCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  displayOrder: number | null;
  isDiscoverable: boolean;
  isActive: boolean;
  metadata: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface IJob {
  id: string;
  employerId: string;
  companyId: string;
  categoryId: string;
  subCategoryId: string;

  customCategory: string | null;
  customSubCategory: string | null;
  clonedFromId: string | null;

  title: string;
  description: string;

  jobType: string[];
  workMode: string[];

  experienceLevel: string | null;
  experienceMin: number;
  experienceMax: number;

  location: string;
  city: string;
  state: string;
  country: string;

  salaryMin: number;
  salaryMax: number;
  showSalary: boolean;
  payRate: string;

  skills: string[];
  qualification: string | null;
  certification: string | null;

  benefits: string | null;
  travelRequirements: string | null;
  immigrationStatus: string | null;

  deadline: string;

  applicationEmail: string | null;
  bannerImage: string | null;
  section: string | null;

  isActive: boolean;
  status: string;

  isFeatured: boolean;
  isHighlighted: boolean;
  isUrgent: boolean;
  isCloned: boolean;

  renewalCount: number;
  lastRenewedAt: string | null;

  duplicateHash: string | null;

  viewCount: number;
  applicationCount: number;

  trendingScore: number | null;
  popularityScore: number | null;
  relevanceScore: number | null;

  lastActivityAt: string | null;

  createdAt: string;
  updatedAt: string;

  employer: IUser;
  company: ICompany;
  category: IJobCategory;

  isSaved: boolean;
  isApplied: boolean;
}

export interface IApplication {
  id: string;
  jobId: string;
  jobSeekerId: string;
  status: string;
  coverLetter: string | null;
  resumeUrl: string;
  resumeSnapshot: {
    city: string;
    email: string;
    phone: string;
    state: string;
    country: string;
    headline: string;
    lastName: string;
    firstName: string;
    resumeUrl: string;
    snapshotAt: string;
    professionalSummary: string;
    totalExperienceYears: number | null;
  };
  screeningAnswers: any;
  rating: number | null;
  notes: string | null;
  fitScore: number | null;
  source: string;
  agreeConsent: boolean;
  isOnHold: boolean;
  statusHistory: {
    status: string;
    changedBy: string;
    timestamp: string;
  }[];
  appliedAt: string;
  viewedAt: string | null;
  job: IJob;
}

export interface ProfileEditProps {
  control: any;
  errors: any;
  handleSubmit: any;
  isSubmitting: boolean;
  refetch: () => void;
  setValue?: any;
}

export interface ICompany {
  name: string;
  location: string;
  sales: string;
  category: string;
  jobs: number;
  description: string;
}

export interface ITemplate {
  id: string;
  name: string;
  thumbnailUrl: string;
  isPremium: boolean;
  displayOrder: number;
  templateType: string;
  templateLevel: TemplateLevels;
}

export interface CommonFormProps {
  control: Control<any>;
  errors: any;
  isSubmitting: boolean;
  onSubmit: any;
  id?: string;
  setValue?: any;
}

export interface IChatRoom {
  uid: string;
  name: string;
  profilePhoto: string | null;
  lastMessage: {
    message: string;
    createdAt: string;
  };
}

export interface IChatMessage {
  uid: string;
  senderId: string;
  message: string;
  createdAt: string;
}

export interface IAvatar {
  id: string;
  name: string;
  imageUrl: string;
}

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ICompany {
  companyId: string;
  companyName: string;
  slug: string;
  verificationStatus: string;
}

export interface IPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  isEnabled: boolean;
}

export interface IOption {
  key: string;
  label: string;
}
