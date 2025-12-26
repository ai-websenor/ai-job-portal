// Shared TypeScript types and interfaces

export interface IUser {
  id: string;
  email: string;
  role: 'candidate' | 'employer' | 'admin' | 'team_member';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobSeeker extends IUser {
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  bio?: string;
  resume?: string;
  videoResume?: string;
  skills: string[];
  experience: IWorkExperience[];
  education: IEducation[];
}

export interface IEmployer extends IUser {
  companyName: string;
  companyLogo?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  isVerified: boolean;
  subscriptionPlan: 'free' | 'basic' | 'premium' | 'enterprise';
}

export interface IWorkExperience {
  id: string;
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
  location?: string;
}

export interface IEducation {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

export interface IJob {
  id: string;
  employerId: string;
  title: string;
  description: string;
  jobType: 'full_time' | 'part_time' | 'contract' | 'gig' | 'remote';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  deadline?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApplication {
  id: string;
  jobId: string;
  jobSeekerId: string;
  status: 'applied' | 'viewed' | 'shortlisted' | 'interview_scheduled' | 'rejected' | 'hired';
  coverLetter?: string;
  resumeUrl?: string;
  appliedAt: Date;
  updatedAt: Date;
}

export interface INotification {
  id: string;
  userId: string;
  type: 'job_alert' | 'application_update' | 'interview' | 'message';
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface IPayment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  invoiceUrl?: string;
  createdAt: Date;
}

export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface IPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IJobSearchParams extends IPaginationParams {
  query?: string;
  jobType?: string[];
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string[];
  skills?: string[];
}
