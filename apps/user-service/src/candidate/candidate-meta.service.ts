import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CandidateMetaResponseDto } from './dto/candidate-meta.response.dto';
import {
  profiles,
  profileSkills,
  skills,
  educationRecords,
  workExperiences,
  jobPreferences,
  users,
} from '@ai-job-portal/database';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class CandidateMetaService {
  private readonly logger = new Logger(CandidateMetaService.name);

  constructor(private readonly dbService: DatabaseService) {}

  async getMeta(userId: string): Promise<CandidateMetaResponseDto> {
    try {
      // 1. Fetch User and Profile Data
      const userProfile = await this.dbService.db
        .select({
          user: users,
          profile: profiles,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1)
        .then((res) => res[0]);

      if (!userProfile || !userProfile.user) {
        throw new Error('User not found');
      }

      // Default empty response structure
      const response: CandidateMetaResponseDto = {
        personalInfo: {
          id: userProfile?.profile?.id || null, // Handle if profile is missing
          firstName: userProfile.user.firstName,
          lastName: userProfile.user.lastName,
          email: userProfile.user.email,
          mobile: userProfile.user.mobile,
          city: null,
          state: null,
          country: null,
        },
        skills: {
          technical: [],
          soft: [],
        },
        education: [],
        workExperience: [],
        jobPreferences: {
          id: null,
          jobTypes: [],
          preferredLocations: [],
          willingToRelocate: false,
          expectedSalaryMin: null,
          expectedSalaryMax: null,
          expectedSalary: null,
          salaryCurrency: 'INR',
          preferredIndustries: [],
          workShift: null,
          jobSearchStatus: null,
          noticePeriodDays: 30,
        },
      };

      // If no profile exists yet, return the basic info from users table
      if (!userProfile.profile) {
        return response;
      }

      const profile = userProfile.profile;
      const profileId = profile.id;

      // Populate Personal Info from Profile
      response.personalInfo = {
        id: profile.id,
        firstName: profile.firstName || userProfile.user.firstName,
        lastName: profile.lastName || userProfile.user.lastName,
        email: profile.email || userProfile.user.email,
        mobile: profile.phone || userProfile.user.mobile,
        city: profile.city || null,
        state: profile.state || null,
        country: profile.country || null,
      };

      // 2. Fetch Skills
      const candidateSkills = await this.dbService.db
        .select({
          skillName: skills.name,
          category: skills.category,
        })
        .from(profileSkills)
        .innerJoin(skills, eq(profileSkills.skillId, skills.id))
        .where(eq(profileSkills.profileId, profileId));

      const technicalSkills = candidateSkills
        .filter((s) => s.category === 'technical')
        .map((s) => s.skillName);
      const softSkills = candidateSkills
        .filter((s) => s.category === 'soft')
        .map((s) => s.skillName);

      response.skills = {
        technical: technicalSkills,
        soft: softSkills,
      };

      // 3. Fetch Education
      const educationData = await this.dbService.db
        .select()
        .from(educationRecords)
        .where(eq(educationRecords.profileId, profileId))
        .orderBy(desc(educationRecords.startDate)); // Most recent first

      response.education = educationData.map((edu) => ({
        id: edu.id,
        level: edu.level,
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy,
        startDate: edu.startDate || null,
        endDate: edu.endDate || null,
        grade: edu.grade,
        currentlyStudying: edu.currentlyStudying || false,
        description: edu.description,
      }));

      // 4. Fetch Work Experience
      const workData = await this.dbService.db
        .select()
        .from(workExperiences)
        .where(eq(workExperiences.profileId, profileId))
        .orderBy(desc(workExperiences.startDate)); // Most recent first

      response.workExperience = workData.map((work) => ({
        id: work.id,
        companyName: work.companyName,
        jobTitle: work.jobTitle,
        employmentType: work.employmentType,
        location: work.location,
        startDate: work.startDate, // date string
        endDate: work.endDate || null,
        isCurrent: work.isCurrent || false,
        description: work.description,
        achievements: work.achievements,
        skillsUsed: work.skillsUsed
          ? work.skillsUsed
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : [],
        duration: work.duration,
        designation: work.designation,
      }));

      // 5. Fetch Job Preferences
      const prefData = await this.dbService.db
        .select()
        .from(jobPreferences)
        .where(eq(jobPreferences.profileId, profileId))
        .limit(1)
        .then((res) => res[0]);

      if (prefData) {
        const parseJsonSafe = (jsonString: string | null): string[] => {
          if (!jsonString) return [];
          try {
            return JSON.parse(jsonString) as string[];
          } catch (e) {
            return [];
          }
        };

        response.jobPreferences = {
          id: prefData.id,
          jobTypes: parseJsonSafe(prefData.jobTypes),
          preferredLocations: parseJsonSafe(prefData.preferredLocations),
          willingToRelocate: prefData.willingToRelocate || false,
          expectedSalaryMin: prefData.expectedSalaryMin ? Number(prefData.expectedSalaryMin) : null,
          expectedSalaryMax: prefData.expectedSalaryMax ? Number(prefData.expectedSalaryMax) : null,
          expectedSalary: prefData.expectedSalary ? Number(prefData.expectedSalary) : null,
          salaryCurrency: prefData.salaryCurrency || 'INR',
          preferredIndustries: parseJsonSafe(prefData.preferredIndustries),
          workShift: prefData.workShift,
          jobSearchStatus: prefData.jobSearchStatus,
          noticePeriodDays: prefData.noticePeriodDays || 30,
        };
      }

      return response;
    } catch (error) {
      this.logger.error(`Error fetching candidate meta for userId ${userId}`, error);
      throw error;
    }
  }
}
