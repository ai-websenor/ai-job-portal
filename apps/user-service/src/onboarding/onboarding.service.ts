import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
import { users } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import OpenAI from "openai";
import cloudinary from '../config/cloudinary.config';
import * as mammoth from "mammoth";

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
  private readonly logger = new Logger(OnboardingService.name);
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
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");

    if (!apiKey) {
      this.logger.error("OPENAI_API_KEY is missing");
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Create user profile (personal info)
   */
  async createPersonalInfo(userId: string, createDto: CreateProfileDto) {
    this.logger.log(`Creating personal info for user ${userId}`);
    const profile = await this.profileService.create(userId, createDto);

    // Update onboarding step
    await this.databaseService.db
      .update(users)
      .set({ onboardingStep: 2 })
      .where(eq(users.id, userId));

    return {
      ...profile,
      message: "Profile info added successfully"
    };
  }

  /**
   * Add education record
   */
  async addEducation(userId: string, createDto: CreateEducationDto[]) {
    this.logger.log(`Adding education for user ${userId}`);
    const profile = await this.profileService.findByUserId(userId);
    const education = await this.educationService.create(profile.id, createDto);

    // Update onboarding step
    await this.databaseService.db
      .update(users)
      .set({ onboardingStep: 3 })
      .where(eq(users.id, userId));

    return {
      education,
      message: "Education added successfully"
    };
  }

  /**
   * Add skill to profile
   */
  async addSkill(userId: string, createDto: CreateProfileSkillDto) {
    this.logger.log(`Adding skill for user ${userId}`);
    const profile = await this.profileService.findByUserId(userId);
    const skill = await this.skillsService.addSkillToProfile(profile.id, createDto);

    // Update onboarding step
    await this.databaseService.db
      .update(users)
      .set({ onboardingStep: 4 })
      .where(eq(users.id, userId));

    return {
      ...skill,
      message: "Skill added successfully"
    };
  }

  /**
   * Add work experience
   */
  async addExperience(userId: string, createDto: CreateWorkExperienceDto) {
    this.logger.log(`Adding work experience for user ${userId}`);
    const profile = await this.profileService.findByUserId(userId);
    const experience = await this.workExperienceService.create(profile.id, createDto);

    // Update onboarding step
    await this.databaseService.db
      .update(users)
      .set({ onboardingStep: 5 })
      .where(eq(users.id, userId));

    return {
      ...experience,
      message: "Experience added successfully"
    };
  }

  /**
   * Create/update job preferences
   */
  async updatePreferences(userId: string, updateDto: UpdateJobPreferencesDto) {
    this.logger.log(`Updating preferences for user ${userId}`);
    const profile = await this.profileService.findByUserId(userId);
    const preferences = await this.preferencesService.update(profile.id, updateDto);

    // Update onboarding step and mark as completed
    await this.databaseService.db
      .update(users)
      .set({ onboardingStep: 6, isOnboardingCompleted: true })
      .where(eq(users.id, userId));

    return {
      ...preferences,
      message: "Preferences updated successfully"
    };
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
    this.logger.log(`Uploading resume for user ${userId}`);
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
    resumeName: _resumeName,
    isDefault: _isDefault,
    isBuiltWithBuilder: _isBuiltWithBuilder,
  }: {
    userId: string;
    file: any;
    resumeName: string;
    isDefault?: boolean;
    isBuiltWithBuilder?: boolean;
  }) {
    const upload = await this.uploadResumeFile(
      userId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );


    const parsed = await this.parseResume(
      userId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    return {
      message: "Resume uploaded successfully",
      ...upload,
      ...parsed,
    };
  }


  /**
 * Parse resume content, extract structured data using AI, and save to user profile
 */
  async parseResume(userId: string, file: Buffer, contentType: string, filename: string) {
    this.logger.log(`Parsing resume ${filename} for user ${userId}...`);

    // Extract raw text from resume
    const rawText = await this.extractText(file, contentType);

    this.logger.log(`Extracted ${rawText.length} characters from resume ${filename}. Starting AI extraction...`);

    // Structure data using AI
    // let structuredData = await this.extractStructuredData(rawText);

    let structuredData = {
      "filename": "resume_data_analyst.docx",
      "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "personalDetails": {
        "firstName": "Riya",
        "lastName": "Sharma",
        "phoneNumber": "912-345-6789",
        "email": "riya.sharma@analyticsmail.com",
        "state": "Maharashtra",
        "city": "Pune",
        "country": "India"
      },
      "educationalDetails": [
        {
          "degree": "Bachelor of Science in Statistics",
          "institutionName": "Savitribai Phule Pune University",
          "yearOfCompletion": "2018"
        },
        {
          "degree": "Post Graduate Diploma in Data Science",
          "institutionName": "IIIT Bangalore",
          "yearOfCompletion": "2020"
        }
      ],
      "skills": {
        "technicalSkills": [
          "Data analysis",
          "SQL",
          "Python",
          "Power BI"
        ],
        "softSkills": [
          "Critical thinking",
          "Problem solving",
          "Attention to detail"
        ]
      },
      "experienceDetails": [
        {
          "jobTitle": "Senior Data Analyst",
          "companyName": "InsightWorks Analytics",
          "designation": "",
          "duration": "January 2022 – Present",
          "description": [
            "Analyzed large datasets to identify business trends",
            "Built dashboards to support management decisions",
            "Reduced reporting time by 35%"
          ]
        },
        {
          "jobTitle": "Data Analyst",
          "companyName": "Quantify Solutions",
          "designation": "",
          "duration": "July 2020 – December 2021",
          "description": [
            "Created SQL queries for data extraction",
            "Worked with cross-functional teams for data validation"
          ]
        },
        {
          "jobTitle": "Data Analyst Intern",
          "companyName": "DataNest",
          "designation": "",
          "duration": "January 2020 – June 2020",
          "description": [
            "Cleaned and prepared raw datasets",
            "Supported senior analysts in reporting tasks"
          ]
        }
      ],
      "jobPreferences": {
        "industryPreferences": [
          "Data Analytics",
          "FinTech",
          "Healthcare Analytics"
        ],
        "preferredLocation": [
          "Pune",
          "Bangalore",
          "Remote"
        ]
      }
    }


    // make sure this is an object, not a string
    if (typeof structuredData === "string") {
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

      this.logger.log(`Structured resume data stored in users table for user ${userId}`);

    } catch (error: any) {
      this.logger.error(`Failed to store/sync structured resume data for user ${userId}: ${error.message}`);
    }

    return {
      filename,
      contentType,
      ...structuredData,
    };
  }

  async extractText(file: Buffer, contentType: string): Promise<string> {
    try {
      if (contentType === "application/pdf") {
        return await this.parsePdf(file);
      }

      if (
        contentType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        contentType === "application/msword"
      ) {
        return await this.parseDocx(file);
      }

      throw new BadRequestException(`Unsupported file type: ${contentType}`);
    } catch (error: any) {
      this.logger.error(
        `Error extracting resume text: ${error?.message || "Unknown error"}`
      );
      return "";
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
      cloudinary.uploader.upload_stream(
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
      ).end(fileBuffer);
    });
  }



  private async parsePdf(file: Buffer): Promise<string> {
    // Dynamic import to handle potential issues with pdf-parse in some environments
    const pdfParse = (await import("pdf-parse")) as any;
    const data = await pdfParse.default(file);
    return data.text;
  }

  private async parseDocx(file: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: file });
    return result.value;
  }

  async extractStructuredData(
    resumeText: string,
  ): Promise<StructuredResume> {
    if (!this.openai) {
      throw new InternalServerErrorException("OpenAI not configured");
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You extract structured resume data.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;

      // ✅ Parse JSON string into object
      return JSON.parse(content) as StructuredResume;
    } catch (error: any) {
      this.logger.error("Resume parsing failed", error);
      throw new InternalServerErrorException(
        "AI resume extraction failed",
      );
    }
  }
}
