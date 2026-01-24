import { ApplicationStatus, InterviewStatus, InterviewType } from './enums';

export interface Application {
  id: string;
  jobId: string;
  candidateProfileId: string;
  resumeId?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  appliedAt: Date;
  updatedAt: Date;
}

export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: Date;
  duration: number;
  location?: string;
  meetingLink?: string;
  interviewerNotes?: string;
  candidateFeedback?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationNote {
  id: string;
  applicationId: string;
  userId: string;
  content: string;
  isPrivate: boolean;
  createdAt: Date;
}

export interface Offer {
  id: string;
  applicationId: string;
  salary: number;
  currency: string;
  joiningDate: Date;
  expiresAt: Date;
  additionalBenefits?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  respondedAt?: Date;
  createdAt: Date;
}

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  fromStatus?: ApplicationStatus;
  toStatus: ApplicationStatus;
  changedBy: string;
  note?: string;
  createdAt: Date;
}
