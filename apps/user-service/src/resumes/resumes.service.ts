import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { resumes, users } from '@ai-job-portal/database';
import { eq, and } from 'drizzle-orm';
import { ResumeTextService } from './resume-text.service';
import { ResumeAiService } from './resume-ai.service';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class ResumesService {
  private readonly logger = new CustomLogger();
  private readonly MAX_RESUMES = 5;
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService,
    private resumeTextService: ResumeTextService,
    private resumeAiService: ResumeAiService,
  ) {}

  /**
   * Upload a resume file
   */
  async uploadResume(
    profileId: string,
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string,
    createDto: CreateResumeDto,
  ) {
    const db = this.databaseService.db;

    // BUSINESS RULE: Maximum 5 resumes per user
    // Check resume count BEFORE uploading to storage
    const existingResumesCount = await db.query.resumes.findMany({
      where: eq(resumes.profileId, profileId),
      columns: { id: true }, // Only fetch ID for counting
    });

    if (existingResumesCount.length >= this.MAX_RESUMES) {
      throw new BadRequestException('You can upload a maximum of 5 resumes');
    }

    // Validate file type
    if (!this.ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException('Invalid file type. Only PDF, DOC, and DOCX files are allowed');
    }

    // Determine file type enum
    let fileType: 'pdf' | 'doc' | 'docx';
    if (contentType === 'application/pdf') {
      fileType = 'pdf';
    } else if (
      contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
    } else {
      fileType = 'doc';
    }

    // Upload file to MinIO
    const uploadResult = await this.storageService.uploadResume(
      userId,
      file,
      filename,
      contentType,
    );

    // Extract content from resume
    const parsedContent = await this.resumeTextService.extractText(file, contentType);
    this.logger.info(
      `Extracted ${parsedContent.length} characters from resume ${filename}`,
      'ResumesService',
    );

    // If this is set as default, unset other defaults
    if (createDto.isDefault) {
      await db.update(resumes).set({ isDefault: false }).where(eq(resumes.profileId, profileId));
    }

    // Create resume record
    const [resume] = await db
      .insert(resumes)
      .values({
        profileId,
        fileName: filename,
        filePath: uploadResult.key,
        fileSize: uploadResult.size,
        fileType,
        resumeName: createDto.resumeName,
        isDefault: createDto.isDefault || false,
        isBuiltWithBuilder: createDto.isBuiltWithBuilder || false,
        parsedContent: parsedContent || null,
      })
      .returning();

    this.logger.success(`Resume uploaded for profile ${profileId}`, 'ResumesService');

    return {
      resume,
      file: uploadResult,
    };
  }

  /**
   * Get all resumes for a profile
   * Returns only required fields for Manual Apply (excludes heavy parsed_content)
   */
  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    const userResumes = await db.query.resumes.findMany({
      where: eq(resumes.profileId, profileId),
      orderBy: (resumes, { desc }) => [desc(resumes.isDefault), desc(resumes.createdAt)],
      columns: {
        id: true,
        resumeName: true,
        fileType: true,
        filePath: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return { ...userResumes, message: 'Listed all resumes successfully' };
  }

  /**
   * Get a specific resume
   */
  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.id, id), eq(resumes.profileId, profileId)),
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // remove heavy fields
    const { parsedContent, ...safeResume } = resume;

    // parse parsedContent safely
    let parsed: any = null;

    try {
      parsed = parsedContent ? JSON.parse(parsedContent) : null;
    } catch (error) {
      parsed = null;
    }

    return {
      data: {
        ...safeResume,
        personalDetails: parsed?.personalDetails ?? null,
        educationalDetails: parsed?.educationalDetails ?? [],
        skills: parsed?.skills ?? {},
        experienceDetails: parsed?.experienceDetails ?? [],
        jobPreferences: parsed?.jobPreferences ?? {},
      },
      message: 'Resume fetched successfully',
      status: 'success',
      statusCode: 200,
    };
  }

  /**
   * Update resume metadata
   */
  async update(id: string, profileId: string, updateDto: UpdateResumeDto) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId);

    // If setting as default, unset other defaults
    if (updateDto.isDefault) {
      await db.update(resumes).set({ isDefault: false }).where(eq(resumes.profileId, profileId));
    }

    const updateData: any = {
      resumeName: updateDto.resumeName,
      isDefault: updateDto.isDefault,
      isBuiltWithBuilder: updateDto.isBuiltWithBuilder,
      updatedAt: new Date(),
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const [updated] = await db
      .update(resumes)
      .set(updateData)
      .where(and(eq(resumes.id, id), eq(resumes.profileId, profileId)))
      .returning();

    this.logger.success(`Resume ${id} updated`, 'ResumesService');
    return updated;
  }

  /**
   * Delete resume
   */
  async delete(id: string, profileId: string) {
    const db = this.databaseService.db;

    const resumeResponse = await this.findOne(id, profileId);

    // Delete file from storage
    try {
      const buckets = this.storageService.getBuckets();
      await this.storageService.deleteFile(buckets.resumes, resumeResponse.data.filePath);
    } catch (error: any) {
      this.logger.warn(
        `Failed to delete resume file from storage: ${error.message}`,
        'ResumesService',
      );
    }

    await db.delete(resumes).where(and(eq(resumes.id, id), eq(resumes.profileId, profileId)));

    this.logger.success(`Resume ${id} deleted`, 'ResumesService');
    return { message: 'Resume deleted successfully' };
  }

  /**
   * Set a resume as default
   */
  async setDefault(id: string, profileId: string) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId);

    // Unset all defaults
    await db.update(resumes).set({ isDefault: false }).where(eq(resumes.profileId, profileId));

    // Set this one as default
    const [updated] = await db
      .update(resumes)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(resumes.id, id))
      .returning();

    this.logger.success(`Resume ${id} set as default`, 'ResumesService');
    return updated;
  }

  /**
   * Get download URL for a resume
   */
  async getDownloadUrl(id: string, profileId: string, expiresIn: number = 3600) {
    const resumeResponse = await this.findOne(id, profileId);
    const resume = resumeResponse.data;

    const buckets = this.storageService.getBuckets();
    const url = await this.storageService.getPresignedUrl(
      buckets.resumes,
      resume.filePath,
      expiresIn,
    );

    return {
      url,
      expiresIn,
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        fileType: resume.fileType,
      },
    };
  }

  /**
   * Parse resume content, extract structured data using AI, and save to user profile
   */
  async parseResume(userId: string, file: Buffer, contentType: string, filename: string) {
    this.logger.info(`Parsing resume ${filename} for user ${userId}...`, 'ResumesService');

    // Extract raw text from resume
    const rawText = await this.resumeTextService.extractText(file, contentType);

    this.logger.info(
      `Extracted ${rawText.length} characters from resume ${filename}. Starting AI extraction...`,
      'ResumesService',
    );

    // Structure data using AI
    // const structuredData = await this.resumeAiService.extractStructuredData(rawText);

    let structuredData = {
      filename: 'resume2.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      personalDetails: {
        firstName: 'Kai',
        lastName: 'Carter',
        phoneNumber: '678-555-0103',
        email: 'kai@lamnahealthcare.com',
        state: '',
        city: '',
        country: '',
      },
      educationalDetails: [
        {
          degree: 'Bachelor of Science in Biology',
          institutionName: 'Bellows College',
          yearOfCompletion: '20XX',
        },
        {
          degree: '',
          institutionName: 'Jasper University',
          yearOfCompletion: '20XX',
        },
      ],
      skills: {
        technicalSkills: ['Clinical diagnosis', 'Health promotion', 'Chronic disease management'],
        softSkills: ['Patient-centered care'],
      },
      experienceDetails: [
        {
          jobTitle: 'General Practitioner',
          companyName: 'Lamna Healthcare',
          designation: '',
          duration: 'December 20XX – present',
          description: [
            'Implemented evidence-based medicine for accurate diagnosis',
            'Spearheaded a community health fair',
            'Provided free screenings to over 200 residents',
          ],
        },
        {
          jobTitle: 'Family Physician',
          companyName: 'Tyler Stein MD',
          designation: '',
          duration: 'August 20XX – July 20XX',
          description: [
            'Managed a diverse patient caseload',
            'Led a smoking cessation program resulting in a 30% increase in successful quit attempts',
          ],
        },
        {
          jobTitle: 'Medical Officer',
          companyName: 'City Hospital',
          designation: '',
          duration: 'April 20XX – August 20XX',
          description: [
            'Provided emergency medical care with a focus on trauma cases',
            'Collaborated with specialists to enhance patient outcomes',
          ],
        },
      ],
      jobPreferences: {
        industryPreferences: [],
        preferredLocation: [],
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
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      this.logger.success(
        `Structured resume data stored in users table for user ${userId}`,
        'ResumesService',
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to store/sync structured resume data for user ${userId}: ${error.message}`,
        error,
        'ResumesService',
      );
    }

    return {
      filename,
      contentType,
      ...structuredData,
    };
  }
}
