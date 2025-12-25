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
        return this.profileService.create(userId, createDto);
    }

    /**
     * Add education record
     */
    async addEducation(userId: string, createDto: CreateEducationDto) {
        this.logger.log(`Adding education for user ${userId}`);
        const profile = await this.profileService.findByUserId(userId);
        return this.educationService.create(profile.id, createDto);
    }

    /**
     * Add skill to profile
     */
    async addSkill(userId: string, createDto: CreateProfileSkillDto) {
        this.logger.log(`Adding skill for user ${userId}`);
        const profile = await this.profileService.findByUserId(userId);
        return this.skillsService.addSkillToProfile(profile.id, createDto);
    }

    /**
     * Add work experience
     */
    async addExperience(userId: string, createDto: CreateWorkExperienceDto) {
        this.logger.log(`Adding work experience for user ${userId}`);
        const profile = await this.profileService.findByUserId(userId);
        return this.workExperienceService.create(profile.id, createDto);
    }

    /**
     * Create/update job preferences
     */
    async updatePreferences(userId: string, updateDto: UpdateJobPreferencesDto) {
        this.logger.log(`Updating preferences for user ${userId}`);
        const profile = await this.profileService.findByUserId(userId);
        return this.preferencesService.update(profile.id, updateDto);
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
          "filename": "resume2.docx",
          "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "personalDetails": {
            "firstName": "Kai",
            "lastName": "Carter",
            "phoneNumber": "678-555-0103",
            "email": "kai@lamnahealthcare.com",
            "state": "",
            "city": "",
            "country": ""
          },
          "educationalDetails": [
            {
              "degree": "Bachelor of Science in Biology",
              "institutionName": "Bellows College",
              "yearOfCompletion": "20XX"
            },
            {
              "degree": "",
              "institutionName": "Jasper University",
              "yearOfCompletion": "20XX"
            }
          ],
          "skills": {
            "technicalSkills": [
              "Clinical diagnosis",
              "Health promotion",
              "Chronic disease management"
            ],
            "softSkills": [
              "Patient-centered care"
            ]
          },
          "experienceDetails": [
            {
              "jobTitle": "General Practitioner",
              "companyName": "Lamna Healthcare",
              "designation": "",
              "duration": "December 20XX – present",
              "description": [
                "Implemented evidence-based medicine for accurate diagnosis",
                "Spearheaded a community health fair",
                "Provided free screenings to over 200 residents"
              ]
            },
            {
              "jobTitle": "Family Physician",
              "companyName": "Tyler Stein MD",
              "designation": "",
              "duration": "August 20XX – July 20XX",
              "description": [
                "Managed a diverse patient caseload",
                "Led a smoking cessation program resulting in a 30% increase in successful quit attempts"
              ]
            },
            {
              "jobTitle": "Medical Officer",
              "companyName": "City Hospital",
              "designation": "",
              "duration": "April 20XX – August 20XX",
              "description": [
                "Provided emergency medical care with a focus on trauma cases",
                "Collaborated with specialists to enhance patient outcomes"
              ]
            }
          ],
          "jobPreferences": {
            "industryPreferences": [],
            "preferredLocation": []
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
                    updatedAt: new Date(),
                } as any)
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
