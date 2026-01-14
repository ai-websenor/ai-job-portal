import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as schema from '@ai-job-portal/database';
import { DATABASE_CONNECTION } from '../database/database.module';
import { EmployerCandidateResponseDto } from './dto/employer-candidate-response.dto';

@Injectable()
export class EmployerCandidateService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getCandidateProfileForEmployer(
    candidateId: string,
    user: any,
  ): Promise<{ data: EmployerCandidateResponseDto; message: string }> {
    // Step 0: Check candidate exists (404 vs 403 distinction)
    const [candidateExists] = await this.db
      .select({ id: schema.profiles.userId })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, candidateId))
      .limit(1);

    if (!candidateExists) {
      throw new NotFoundException('Candidate not found');
    }

    // Step 1: Authorization - Verify employer has access to this candidate
    const [access] = await this.db
      .select({ exists: sql`1` })
      .from(schema.jobApplications)
      .innerJoin(schema.jobs, eq(schema.jobApplications.jobId, schema.jobs.id))
      .innerJoin(schema.employers, eq(schema.jobs.employerId, schema.employers.id))
      .where(
        and(
          eq(schema.jobApplications.jobSeekerId, candidateId),
          eq(schema.employers.userId, user.id),
        ),
      )
      .limit(1);

    if (!access) {
      throw new ForbiddenException('You are not allowed to view this candidate profile');
    }

    // Step 2: Fetch candidate core profile
    const [profile] = await this.db
      .select({
        id: schema.profiles.id,
        userId: schema.profiles.userId,
        firstName: schema.profiles.firstName,
        lastName: schema.profiles.lastName,
        email: schema.users.email,
        profilePhoto: schema.profiles.profilePhoto,
        city: schema.profiles.city,
        state: schema.profiles.state,
        country: schema.profiles.country,
        totalExperienceYears: schema.profiles.totalExperienceYears,
      })
      .from(schema.profiles)
      .innerJoin(schema.users, eq(schema.profiles.userId, schema.users.id))
      .where(eq(schema.profiles.userId, candidateId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    // Step 2.5: Fetch current job title from work experience
    const [currentJob] = await this.db
      .select({
        title: schema.workExperiences.jobTitle,
      })
      .from(schema.workExperiences)
      .where(
        and(
          eq(schema.workExperiences.profileId, profile.id),
          eq(schema.workExperiences.isCurrent, true),
        ),
      )
      .orderBy(desc(schema.workExperiences.startDate))
      .limit(1);

    const currentJobTitle = currentJob?.title || null;

    // Step 3: Fetch latest resume
    const [resume] = await this.db
      .select({
        filePath: schema.resumes.filePath,
        fileType: schema.resumes.fileType,
      })
      .from(schema.resumes)
      .where(eq(schema.resumes.profileId, profile.id))
      .orderBy(desc(schema.resumes.createdAt))
      .limit(1);

    // Step 4: Fetch skills
    const skillsData = await this.db
      .select({
        skillName: schema.skills.name,
      })
      .from(schema.profileSkills)
      .innerJoin(schema.skills, eq(schema.profileSkills.skillId, schema.skills.id))
      .where(eq(schema.profileSkills.profileId, profile.id));

    const skills = skillsData.map((s) => s.skillName);

    // Step 5: Fetch work experience
    const workExperienceData = await this.db
      .select({
        company: schema.workExperiences.companyName,
        role: schema.workExperiences.jobTitle,
        startDate: schema.workExperiences.startDate,
        endDate: schema.workExperiences.endDate,
        isCurrent: schema.workExperiences.isCurrent,
      })
      .from(schema.workExperiences)
      .where(eq(schema.workExperiences.profileId, profile.id))
      .orderBy(desc(schema.workExperiences.startDate));

    const workExperience = workExperienceData.map((exp) => ({
      company: exp.company,
      role: exp.role,
      from: exp.startDate ? new Date(exp.startDate).toISOString().slice(0, 7) : 'N/A',
      to: exp.isCurrent
        ? 'Present'
        : exp.endDate
          ? new Date(exp.endDate).toISOString().slice(0, 7)
          : 'N/A',
    }));

    // Step 6: Fetch education
    const educationData = await this.db
      .select({
        institution: schema.educationRecords.institution,
        degree: schema.educationRecords.degree,
        fieldOfStudy: schema.educationRecords.fieldOfStudy,
        startDate: schema.educationRecords.startDate,
        endDate: schema.educationRecords.endDate,
      })
      .from(schema.educationRecords)
      .where(eq(schema.educationRecords.profileId, profile.id))
      .orderBy(desc(schema.educationRecords.startDate));

    const education = educationData.map((edu) => ({
      institution: edu.institution,
      degree: edu.degree + (edu.fieldOfStudy ? ` - ${edu.fieldOfStudy}` : ''),
      from: edu.startDate ? new Date(edu.startDate).getFullYear().toString() : 'N/A',
      to: edu.endDate ? new Date(edu.endDate).getFullYear().toString() : 'N/A',
    }));

    // Step 7: Fetch job preferences
    const [preferences] = await this.db
      .select({
        jobTypes: schema.jobPreferences.jobTypes,
        expectedSalaryMin: schema.jobPreferences.expectedSalaryMin,
        expectedSalaryMax: schema.jobPreferences.expectedSalaryMax,
        salaryCurrency: schema.jobPreferences.salaryCurrency,
        noticePeriod: schema.jobPreferences.noticePeriod,
      })
      .from(schema.jobPreferences)
      .innerJoin(schema.profiles, eq(schema.jobPreferences.profileId, schema.profiles.id))
      .where(eq(schema.profiles.userId, candidateId))
      .limit(1);

    // Step 8: Fetch applied jobs (employer context)
    const appliedJobsData = await this.db
      .select({
        jobId: schema.jobs.id,
        jobTitle: schema.jobs.title,
        appliedAt: schema.jobApplications.appliedAt,
        status: schema.jobApplications.status,
      })
      .from(schema.jobApplications)
      .innerJoin(schema.jobs, eq(schema.jobApplications.jobId, schema.jobs.id))
      .innerJoin(schema.employers, eq(schema.jobs.employerId, schema.employers.id))
      .where(
        and(
          eq(schema.jobApplications.jobSeekerId, candidateId),
          eq(schema.employers.userId, user.id),
        ),
      )
      .orderBy(desc(schema.jobApplications.appliedAt));

    const appliedJobs = appliedJobsData.map((job) => ({
      jobId: job.jobId,
      jobTitle: job.jobTitle,
      appliedAt: job.appliedAt.toISOString(),
      status: job.status,
    }));

    // Format response
    const location =
      [profile.city, profile.state, profile.country].filter(Boolean).join(', ') || 'Not specified';

    const response: EmployerCandidateResponseDto = {
      candidate: {
        id: profile.userId,
        name: `${profile.firstName} ${profile.lastName}`,
        email: profile.email,
        profilePhoto: profile.profilePhoto,
        location,
        totalExperienceYears: profile.totalExperienceYears
          ? parseFloat(profile.totalExperienceYears)
          : null,
        noticePeriod: preferences?.noticePeriod || null,
        preferredJobType: preferences?.jobTypes?.[0] || null,
        expectedSalary: preferences
          ? {
              min: preferences.expectedSalaryMin ? parseFloat(preferences.expectedSalaryMin) : null,
              max: preferences.expectedSalaryMax ? parseFloat(preferences.expectedSalaryMax) : null,
              currency: preferences.salaryCurrency,
            }
          : null,
        jobRole: currentJobTitle,
      },
      resume: resume
        ? {
            url: resume.filePath,
            fileType: resume.fileType,
          }
        : null,
      skills,
      workExperience,
      education,
      appliedJobs,
    };

    return {
      data: response,
      message: 'Candidate profile retrieved successfully',
    };
  }
}
