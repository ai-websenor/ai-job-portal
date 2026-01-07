import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProfileService } from '../profile/profile.service';
import { SkillsService } from '../skills/skills.service';
import { EducationService } from '../education/education.service';
import { WorkExperienceService } from '../work-experience/work-experience.service';
import { PreferencesService } from '../preferences/preferences.service';
import { ResumesService } from '../resumes/resumes.service';
import { DatabaseService } from '../database/database.service';
import { CreateProfileDto } from '../profile/dto/create-profile.dto';
import { CreateProfileSkillDto } from '../skills/dto/create-profile-skill.dto';
import { CreateEducationDto } from '../education/dto/create-education.dto';
import { CreateWorkExperienceDto } from '../work-experience/dto/create-work-experience.dto';
import { UpdateJobPreferencesDto } from '../preferences/dto/update-job-preferences.dto';
import { CreateResumeDto } from '../resumes/dto/create-resume.dto';
import { users, resumes } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import cloudinary from '../config/cloudinary.config';
import * as mammoth from 'mammoth';
import { CustomLogger } from '@ai-job-portal/logger';

/**
 * Final structured resume interface
 */
export interface StructuredResume {
  personalDetails: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    state: string;
    city: string;
    country: string;
  };
  educationalDetails: {
    degree: string;
    institutionName: string;
    yearOfCompletion: string;
  }[];
  skills: {
    technicalSkills: string[];
    softSkills: string[];
  };
  experienceDetails: {
    jobTitle: string;
    companyName: string;
    designation: string;
    duration: string;
    description: string[];
  }[];
  jobPreferences: {
    industryPreferences: string[];
    preferredLocation: string[];
  };
}

@Injectable()
export class OnboardingService {
  private readonly logger = new CustomLogger();
  private openai: OpenAI;

  constructor(
    private profileService: ProfileService,
    private skillsService: SkillsService,
    private educationService: EducationService,
    private workExperienceService: WorkExperienceService,
    private preferencesService: PreferencesService,
    private resumesService: ResumesService,
    private databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is missing', undefined, 'OnboardingService');
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Create user profile (personal info)
   */
  async createPersonalInfo(userId: string, createDto: CreateProfileDto) {
    try {
      this.logger.info(`Creating personal info for user ${userId}`, 'OnboardingService');
      const profile = await this.profileService.create(userId, createDto);

      // Update onboarding step
      await this.databaseService.db
        .update(users)
        .set({ onboardingStep: 2 })
        .where(eq(users.id, userId));

      return {
        ...profile,
        message: 'Profile info added successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error creating personal info for user ${userId}`,
        error as Error,
        'OnboardingService',
      );
      throw error;
    }
  }

  /**
   * Add education record
   */
  async addEducation(userId: string, createDto: CreateEducationDto[]) {
    try {
      this.logger.info(`Adding education for user ${userId}`, 'OnboardingService');
      const profile = await this.profileService.findByUserId(userId);
      const education = await this.educationService.create(profile.id, createDto);

      // Update onboarding step
      await this.databaseService.db
        .update(users)
        .set({ onboardingStep: 3 })
        .where(eq(users.id, userId));

      return {
        education,
        message: 'Education added successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error adding education for user ${userId}`,
        error as Error,
        'OnboardingService',
      );
      throw error;
    }
  }

  /**
   * Add skill to profile
   */
  async addSkills(userId: string, createDto: CreateProfileSkillDto[]) {
    try {
      this.logger.info(`Adding ${createDto.length} skills for user ${userId}`, 'OnboardingService');
      const profile = await this.profileService.findByUserId(userId);

      const results = [];
      for (const skillDto of createDto) {
        const skill = await this.skillsService.addSkillToProfile(profile.id, skillDto);
        results.push(skill);
      }

      // Update onboarding step
      await this.databaseService.db
        .update(users)
        .set({ onboardingStep: 4 })
        .where(eq(users.id, userId));

      return {
        skills: results,
        message: 'Skills added successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error adding skills for user ${userId}`,
        error as Error,
        'OnboardingService',
      );
      throw error;
    }
  }

  /**
   * Add work experience
   */
  async addExperience(userId: string, createDto: CreateWorkExperienceDto[]) {
    try {
      this.logger.info(`Adding work experience for user ${userId}`, 'OnboardingService');
      const profile = await this.profileService.findByUserId(userId);

      const results = [];
      for (const experienceDto of createDto) {
        const experience = await this.workExperienceService.create(profile.id, experienceDto);
        results.push(experience);
      }

      // Update onboarding step
      await this.databaseService.db
        .update(users)
        .set({ onboardingStep: 5 })
        .where(eq(users.id, userId));

      return {
        experience: results,
        message: 'Experience added successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error adding work experience for user ${userId}`,
        error as Error,
        'OnboardingService',
      );
      throw error;
    }
  }

  /**
   * Create/update job preferences
   */
  async updatePreferences(userId: string, updateDto: UpdateJobPreferencesDto) {
    try {
      this.logger.info(`Updating preferences for user ${userId}`, 'OnboardingService');
      const profile = await this.profileService.findByUserId(userId);
      const preferences = await this.preferencesService.update(profile.id, updateDto);

      // Update onboarding step and mark as completed
      await this.databaseService.db
        .update(users)
        .set({ onboardingStep: 6, isOnboardingCompleted: true })
        .where(eq(users.id, userId));

      return {
        ...preferences,
        message: 'Preferences updated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error updating preferences for user ${userId}`,
        error as Error,
        'OnboardingService',
      );
      throw error;
    }
  }

  /**
   * Upload resume
   */
  async uploadResume(
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string,
    createDto: CreateResumeDto,
  ) {
    this.logger.info(`Uploading resume for user ${userId}`, 'OnboardingService');
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.uploadResume(
      profile.id,
      userId,
      file,
      filename,
      contentType,
      createDto,
    );
  }

  async uploadAndParseResume({
    userId,
    file,
    resumeName,
    isDefault,
    isBuiltWithBuilder,
  }: {
    userId: string;
    file: any;
    resumeName: string;
    isDefault?: boolean;
    isBuiltWithBuilder?: boolean;
  }) {
    const db = this.databaseService.db;

    // Get user's profile (needed for profileId)
    const profile = await this.profileService.findByUserId(userId);

    // Upload file to Cloudinary
    const upload = await this.uploadResumeFile(
      userId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    // Parse resume content
    const parsed = await this.parseResume(userId, file.buffer, file.mimetype, file.originalname);

    // Determine file type enum
    let fileType: 'pdf' | 'doc' | 'docx';
    if (file.mimetype === 'application/pdf') {
      fileType = 'pdf';
    } else if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
    } else {
      fileType = 'doc';
    }

    // Check if user has existing resumes to determine default
    const existingResumes = await db.query.resumes.findMany({
      where: eq(resumes.profileId, profile.id),
    });

    // If this is the first resume, mark as default
    const shouldBeDefault = existingResumes.length === 0 || isDefault === true;

    // If setting as default, unset other defaults first
    if (shouldBeDefault && existingResumes.length > 0) {
      await db.update(resumes).set({ isDefault: false }).where(eq(resumes.profileId, profile.id));
    }

    // Default resume name to filename without extension if not provided
    const finalResumeName = resumeName || file.originalname.replace(/\.[^/.]+$/, '');

    // Store resume metadata in resumes table
    const [resumeRecord] = await db
      .insert(resumes)
      .values({
        profileId: profile.id,
        fileName: file.originalname,
        filePath: upload.file_url, // Cloudinary secure URL
        fileSize: upload.file_size,
        fileType,
        resumeName: finalResumeName,
        isDefault: shouldBeDefault,
        isBuiltWithBuilder: isBuiltWithBuilder || false,
        parsedContent: JSON.stringify(parsed),
      })
      .returning();

    this.logger.success(
      `Resume metadata saved to database for user ${userId}, resume ID: ${resumeRecord.id}`,
      'OnboardingService',
    );

    // remove parsedContent & fileSize here
    const {
      parsedContent: _parsedContent,
      fileSize: _fileSize,
      ...safeResumeRecord
    } = resumeRecord;

    return {
      message: 'Resume uploaded successfully',
      ...safeResumeRecord,
      ...upload,
      ...parsed,
    };
  }

  /**
   * Parse resume content, extract structured data using AI, and save to user profile
   */
  async parseResume(userId: string, file: Buffer, contentType: string, filename: string) {
    this.logger.info(`Parsing resume ${filename} for user ${userId}...`, 'OnboardingService');

    // Extract raw text from resume
    const rawText = await this.extractText(file, contentType);

    this.logger.info(
      `Extracted ${rawText.length} characters from resume ${filename}. Starting AI extraction...`,
      'OnboardingService',
    );

    // Structure data using AI
    // let structuredData = await this.extractStructuredData(rawText);

    let structuredData = {
      filename: 'resume_data_analyst.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      personalDetails: {
        firstName: 'Riya',
        lastName: 'Sharma',
        phoneNumber: '912-345-6789',
        email: 'riya.sharma@analyticsmail.com',
        state: 'Maharashtra',
        city: 'Pune',
        country: 'India',
      },
      educationalDetails: [
        {
          degree: 'Bachelor of Science in Statistics',
          institutionName: 'Savitribai Phule Pune University',
          yearOfCompletion: '2018',
        },
        {
          degree: 'Post Graduate Diploma in Data Science',
          institutionName: 'IIIT Bangalore',
          yearOfCompletion: '2020',
        },
      ],
      skills: {
        technicalSkills: ['Data analysis', 'SQL', 'Python', 'Power BI'],
        softSkills: ['Critical thinking', 'Problem solving', 'Attention to detail'],
      },
      experienceDetails: [
        {
          jobTitle: 'Senior Data Analyst',
          companyName: 'InsightWorks Analytics',
          designation: '',
          duration: 'January 2022 – Present',
          description: [
            'Analyzed large datasets to identify business trends',
            'Built dashboards to support management decisions',
            'Reduced reporting time by 35%',
          ],
        },
        {
          jobTitle: 'Data Analyst',
          companyName: 'Quantify Solutions',
          designation: '',
          duration: 'July 2020 – December 2021',
          description: [
            'Created SQL queries for data extraction',
            'Worked with cross-functional teams for data validation',
          ],
        },
        {
          jobTitle: 'Data Analyst Intern',
          companyName: 'DataNest',
          designation: '',
          duration: 'January 2020 – June 2020',
          description: [
            'Cleaned and prepared raw datasets',
            'Supported senior analysts in reporting tasks',
          ],
        },
      ],
      jobPreferences: {
        industryPreferences: ['Data Analytics', 'FinTech', 'Healthcare Analytics'],
        preferredLocation: ['Pune', 'Bangalore', 'Remote'],
      },
    };

    // make sure this is an object, not a string
    if (typeof structuredData === 'string') {
      structuredData = JSON.parse(structuredData);
    }

    // Store structured data in the users table as resumeDetails
    try {
      const db = this.databaseService.db;
      await db
        .update(users)
        .set({
          resumeDetails: structuredData,
          onboardingStep: 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      this.logger.success(
        `Structured resume data stored in users table for user ${userId}`,
        'OnboardingService',
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to store/sync structured resume data for user ${userId}`,
        error,
        'OnboardingService',
      );
    }

    return {
      filename,
      contentType,
      ...structuredData,
    };
  }

  async extractText(file: Buffer, contentType: string): Promise<string> {
    try {
      if (contentType === 'application/pdf') {
        return await this.parsePdf(file);
      }

      if (
        contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        contentType === 'application/msword'
      ) {
        return await this.parseDocx(file);
      }

      throw new BadRequestException(`Unsupported file type: ${contentType}`);
    } catch (error: any) {
      this.logger.error(`Error extracting resume text`, error, 'OnboardingService');
      return '';
    }
  }

  /**
   * Upload resume file in cloudinary
   */

  async uploadResumeFile(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<{ file_url: string; file_publicId: string; file_format: string; file_size: number }> {
    // Allow only pdf & word
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException('Only PDF or Word files are allowed');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `resumes/${userId}`,
            resource_type: 'raw', // VERY IMPORTANT
            public_id: originalName.split('.')[0],
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }

            resolve({
              file_url: result?.secure_url,
              file_publicId: result?.public_id,
              file_format: result?.format,
              file_size: result?.bytes,
            });
          },
        )
        .end(fileBuffer);
    });
  }

  private async parsePdf(file: Buffer): Promise<string> {
    // Dynamic import to handle potential issues with pdf-parse in some environments
    const pdfParse = (await import('pdf-parse')) as any;
    const data = await pdfParse.default(file);
    return data.text;
  }

  private async parseDocx(file: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: file });
    return result.value;
  }

  async extractStructuredData(resumeText: string): Promise<StructuredResume> {
    if (!this.openai) {
      throw new InternalServerErrorException('OpenAI not configured');
    }

    const prompt = `
You are a resume parser.

Convert the resume text into VALID JSON ONLY.

STRICT JSON SCHEMA (do not add extra fields):

{
  "personalDetails": {
    "firstName": "",
    "lastName": "",
    "phoneNumber": "",
    "email": "",
    "state": "",
    "city": "",
    "country": ""
  },
  "educationalDetails": [
    {
      "degree": "",
      "institutionName": "",
      "yearOfCompletion": ""
    }
  ],
  "skills": {
    "technicalSkills": [],
    "softSkills": []
  },
  "experienceDetails": [
    {
      "jobTitle": "",
      "companyName": "",
      "designation": "",
      "duration": "",
      "description": []
    }
  ],
  "jobPreferences": {
    "industryPreferences": [],
    "preferredLocation": []
    
  }
}

RULES:
- Return ONLY valid JSON
- Do NOT explain anything
- If data is missing, keep empty string or empty array
- If multiple degrees exist, add multiple objects
- Split full name into firstName and lastName if possible

Resume Text:
"""
${resumeText}
"""
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You extract structured resume data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;

      // ✅ Parse JSON string into object
      return JSON.parse(content) as StructuredResume;
    } catch (error: any) {
      this.logger.error('Resume parsing failed', error, 'OnboardingService');
      throw new InternalServerErrorException('AI resume extraction failed');
    }
  }
}
