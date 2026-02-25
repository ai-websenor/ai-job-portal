/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  Database,
  profiles,
  resumes,
  resumeTemplates,
  workExperiences,
  educationRecords,
  certifications,
  profileSkills,
  profileLanguages,
  profileProjects,
  skills,
  languages,
} from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import {
  buildResumeHtmlDocument,
  generateResumeBaseStyles,
  renderResumeTemplate,
  A4_DIMENSIONS,
  GOOGLE_FONTS_URL,
  DEFAULT_RESUME_STYLE,
  ResumeStyleConfig,
} from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { updateOnboardingStep, recalculateOnboardingCompletion } from '../utils/onboarding.helper';
import { parseResumeText } from './utils/resume-parser.util';
import { ResumeStructuringService } from './resume-structuring.service';
import { StructuredResumeDataDto } from './dto/resume.dto';
import puppeteer from 'puppeteer';

// Map MIME types to file type enum values
const mimeToFileType: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
    private readonly resumeStructuringService: ResumeStructuringService,
  ) {}

  async uploadResume(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{
    resume: Omit<typeof resumes.$inferSelect, 'parsedContent'>;
    structuredData: StructuredResumeDataDto | null;
  }> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const fileType = mimeToFileType[file.mimetype];
    if (!fileType) {
      throw new BadRequestException('Invalid file type. Only PDF, DOC, DOCX allowed');
    }

    const key = this.s3Service.generateKey('resumes', file.originalname);
    const uploadResult = await this.s3Service.upload(key, file.buffer, file.mimetype);

    // Set all existing resumes for this profile to non-default
    await this.db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.profileId, profile.id));

    // Insert new resume as default
    const [resume] = await this.db
      .insert(resumes)
      .values({
        profileId: profile.id,
        fileName: file.originalname,
        filePath: uploadResult.url,
        fileSize: file.size,
        fileType: fileType as any,
        isDefault: true,
      })
      .returning();

    // Update profile's resumeUrl for backward compatibility
    await this.db
      .update(profiles)
      .set({ resumeUrl: uploadResult.url })
      .where(eq(profiles.id, profile.id));

    await updateOnboardingStep(this.db, userId, 1);

    // Parse and structure resume text, return structured data in response
    const structuredData = await this.parseAndStructureResume(
      resume.id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    // Strip parsedContent from response (internal field, not needed by frontend)
    const { parsedContent: _parsedContent, ...resumeWithoutParsedContent } = resume;
    return { resume: resumeWithoutParsedContent, structuredData };
  }

  /**
   * Parses resume text and structures it using AI.
   * Errors are caught and logged - they do not fail the upload.
   */
  private async parseAndStructureResume(
    resumeId: string,
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<StructuredResumeDataDto | null> {
    try {
      // Step 1: Parse resume text
      const parseResult = await parseResumeText(buffer, mimeType);

      if (!parseResult.success || !parseResult.text) {
        this.logger.warn(
          `Resume ${resumeId} parsing failed: ${parseResult.error || 'Unknown error'}`,
        );
        return null;
      }

      // Store raw parsed text
      await this.db
        .update(resumes)
        .set({ parsedContent: parseResult.text })
        .where(eq(resumes.id, resumeId));

      this.logger.log(
        `Resume ${resumeId} parsed successfully: ${parseResult.text.length} characters`,
      );

      // Step 2: Structure resume text using Hugging Face NER
      const structuredData = await this.resumeStructuringService.structureResumeText(
        parseResult.text,
        filename,
        mimeType,
      );

      if (!structuredData) {
        this.logger.warn(`Resume ${resumeId} structuring returned null`);
        return null;
      }

      this.logger.log(`Resume ${resumeId} structured successfully`);
      return structuredData;
    } catch (error) {
      // Log error but do not throw - parsing/structuring failures should not affect upload
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Resume ${resumeId} parse/structure error: ${errorMessage}`);
      return null;
    }
  }

  async getResumes(userId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const resumeList = await this.db.query.resumes.findMany({
      where: eq(resumes.profileId, profile.id),
    });

    // Strip parsedContent from response (internal field, not needed by frontend)
    return resumeList.map(({ parsedContent: _parsedContent, ...rest }) => rest);
  }

  async deleteResume(userId: string, resumeId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const resume = await this.db.query.resumes.findFirst({
      where: eq(resumes.id, resumeId),
    });
    if (!resume || resume.profileId !== profile.id) {
      throw new NotFoundException('Resume not found');
    }

    // Extract key from URL and delete from S3
    const url = new URL(resume.filePath);
    const key = url.pathname.slice(1);
    await this.s3Service.delete(key);

    await this.db.delete(resumes).where(eq(resumes.id, resumeId));

    await recalculateOnboardingCompletion(this.db, userId);

    return { message: 'Resume deleted' };
  }

  async setPrimaryResume(userId: string, resumeId: string) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Remove default from all
    await this.db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.profileId, profile.id));

    // Set new default
    await this.db.update(resumes).set({ isDefault: true }).where(eq(resumes.id, resumeId));

    return { message: 'Default resume updated' };
  }

  async getResumeDownloadUrl(userId: string, resumeId: string): Promise<{ url: string }> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const resume = await this.db.query.resumes.findFirst({
      where: eq(resumes.id, resumeId),
    });
    if (!resume || resume.profileId !== profile.id) {
      throw new NotFoundException('Resume not found');
    }

    // Return signed URL for secure download (works with private buckets)
    const key = this.s3Service.extractKeyFromUrl(resume.filePath);
    const signedUrl = await this.s3Service.getSignedDownloadUrl(key, 3600); // 1 hour expiry

    return { url: signedUrl };
  }

  async getResumeDownloadUrlByPath(filePath: string): Promise<string> {
    // Return signed URL for secure download (works with private buckets)
    const key = this.s3Service.extractKeyFromUrl(filePath);
    return this.s3Service.getSignedDownloadUrl(key, 3600); // 1 hour expiry
  }

  async getAvailableTemplates() {
    // Fetch only active templates, ordered by display order
    const templates = await this.db.query.resumeTemplates.findMany({
      where: eq(resumeTemplates.isActive, true),
      orderBy: (t, { asc }) => [asc(t.displayOrder)],
      columns: {
        id: true,
        name: true,
        thumbnailUrl: true,
        isPremium: true,
        displayOrder: true,
        templateType: true,
        templateLevel: true,
      },
    });

    return templates;
  }

  private renderTemplateHtml(templateHtml: string, resumeData: any): string {
    return renderResumeTemplate(templateHtml, resumeData);
  }

  /**
   * Launches Puppeteer, renders the HTML, and returns the PDF buffer.
   * Shared between generatePdfFromTemplate and generatePdfFromHtml.
   */
  private async renderPdf(fullHtml: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
      ],
    });

    try {
      const page = await browser.newPage();

      // Set viewport to A4 width for consistent rendering
      await page.setViewport({
        width: A4_DIMENSIONS.WIDTH_PX,
        height: A4_DIMENSIONS.HEIGHT_PX,
        deviceScaleFactor: 1,
      });

      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      const pdfBuffer = await page.pdf({
        width: `${A4_DIMENSIONS.WIDTH_MM}mm`,
        height: `${A4_DIMENSIONS.HEIGHT_MM}mm`,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  async generatePdfFromTemplate(
    userId: string,
    templateId: string,
    resumeData: any,
    styleConfig?: ResumeStyleConfig,
  ) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Fetch template
    const template = await this.db.query.resumeTemplates.findFirst({
      where: eq(resumeTemplates.id, templateId),
    });
    if (!template) throw new NotFoundException('Template not found');

    const renderedHtml = this.renderTemplateHtml(template.templateHtml, resumeData);
    const fullHtml = buildResumeHtmlDocument({
      contentHtml: renderedHtml,
      templateCss: template.templateCss || '',
      styleConfig,
    });

    // Generate PDF using Puppeteer
    this.logger.log('Launching Puppeteer to generate PDF');

    try {
      const pdfBuffer = await this.renderPdf(fullHtml);

      // Upload PDF to S3
      const fileName =
        `${profile.firstName || 'Resume'}_${profile.lastName || ''}_${Date.now()}.pdf`.replace(
          /\s+/g,
          '_',
        );
      const key = this.s3Service.generateKey('resumes', fileName);
      const uploadResult = await this.s3Service.upload(key, pdfBuffer, 'application/pdf');

      this.logger.log(`PDF uploaded to S3: ${uploadResult.url}`);

      // Save to database
      await this.db
        .update(resumes)
        .set({ isDefault: false })
        .where(eq(resumes.profileId, profile.id));

      const [resume] = await this.db
        .insert(resumes)
        .values({
          profileId: profile.id,
          templateId: templateId,
          fileName: fileName,
          filePath: uploadResult.url,
          fileSize: pdfBuffer.length,
          fileType: 'pdf',
          resumeName: `Generated from ${template.name}`,
          isDefault: false,
          isBuiltWithBuilder: true,
        })
        .returning();

      // Update onboarding
      await updateOnboardingStep(this.db, userId, 1);
      await recalculateOnboardingCompletion(this.db, userId);

      return {
        resumeId: resume.id,
        pdfUrl: uploadResult.url,
        fileName: fileName,
      };
    } catch (error) {
      this.logger.error('Failed to generate PDF', error);
      throw new BadRequestException('Failed to generate PDF from template');
    }
  }

  /**
   * Returns template HTML, CSS, and structured user data for the custom template editor.
   * The frontend uses this to render a live-editable preview.
   */
  async getTemplateDataForUser(
    userId: string,
    templateId: string,
    styleConfig?: ResumeStyleConfig,
  ) {
    // Fetch template
    const template = await this.db.query.resumeTemplates.findFirst({
      where: eq(resumeTemplates.id, templateId),
    });
    if (!template) throw new NotFoundException('Template not found');
    if (!template.isActive) throw new BadRequestException('Template is not active');

    // Fetch user profile with related data
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
      with: {
        workExperiences: true,
        educationRecords: true,
        certifications: true,
        profileSkills: true,
        profileLanguages: true,
        profileProjects: true,
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Resolve skill names from profileSkills junction
    const skillIds = (profile.profileSkills || []).map((ps) => ps.skillId);
    let skillMap: Record<string, string> = {};
    if (skillIds.length > 0) {
      const skillRows = await Promise.all(
        skillIds.map((id) => this.db.query.skills.findFirst({ where: eq(skills.id, id) })),
      );
      for (const row of skillRows) {
        if (row) skillMap[row.id] = row.name;
      }
    }

    // Resolve language names from profileLanguages junction
    const languageIds = (profile.profileLanguages || []).map((pl) => pl.languageId);
    let languageMap: Record<string, string> = {};
    if (languageIds.length > 0) {
      const langRows = await Promise.all(
        languageIds.map((id) => this.db.query.languages.findFirst({ where: eq(languages.id, id) })),
      );
      for (const row of langRows) {
        if (row) languageMap[row.id] = row.name;
      }
    }

    // Build structured user data (flexible JSON format for template placeholders)
    const structuredData = {
      personalDetails: {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        headline: profile.headline || '',
        professionalSummary: profile.professionalSummary || '',
        profilePhoto: this.s3Service.getPublicUrlFromKeyOrUrl(profile.profilePhoto) || '',
      },
      educationalDetails: (profile.educationRecords || []).map((edu) => ({
        degree: edu.degree || '',
        institution: edu.institution || '',
        fieldOfStudy: edu.fieldOfStudy || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        grade: edu.grade || '',
        currentlyStudying: edu.currentlyStudying || false,
      })),
      experienceDetails: (profile.workExperiences || []).map((exp) => ({
        jobTitle: exp.jobTitle || '',
        companyName: exp.companyName || '',
        designation: exp.designation || '',
        location: exp.location || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        duration: exp.duration || '',
        isCurrent: exp.isCurrent || false,
        description: exp.description || '',
        achievements: exp.achievements || '',
      })),
      skills: (profile.profileSkills || []).map((ps) => ({
        name: skillMap[ps.skillId] || '',
        proficiencyLevel: ps.proficiencyLevel || '',
        yearsOfExperience: ps.yearsOfExperience || '',
      })),
      certifications: (profile.certifications || []).map((cert) => ({
        name: cert.name || '',
        issuingOrganization: cert.issuingOrganization || '',
        issueDate: cert.issueDate || '',
        expiryDate: cert.expiryDate || '',
        credentialId: cert.credentialId || '',
        credentialUrl: cert.credentialUrl || '',
      })),
      projects: (profile.profileProjects || []).map((proj) => ({
        title: proj.title || '',
        description: proj.description || '',
        startDate: proj.startDate || '',
        endDate: proj.endDate || '',
        url: proj.url || '',
        technologies: proj.technologies || [],
        highlights: proj.highlights || [],
      })),
      languages: (profile.profileLanguages || []).map((pl) => ({
        name: languageMap[pl.languageId] || '',
        proficiency: pl.proficiency || '',
      })),
    };

    return {
      template: {
        id: template.id,
        name: template.name,
        templateHtml: template.templateHtml,
        templateCss: template.templateCss || '',
        templateType: template.templateType,
        templateLevel: template.templateLevel,
        thumbnailUrl: template.thumbnailUrl,
      },
      renderedHtml: this.renderTemplateHtml(template.templateHtml, structuredData),
      structuredData,
      renderConfig: {
        baseStylesCss: generateResumeBaseStyles(styleConfig),
        googleFontsUrl: GOOGLE_FONTS_URL,
        a4Dimensions: A4_DIMENSIONS,
        defaults: DEFAULT_RESUME_STYLE,
      },
    };
  }

  /**
   * Generates a PDF from final HTML content (with user data already injected by frontend).
   * Uploads the PDF to S3 and saves a resume record.
   */
  async generatePdfFromHtml(
    userId: string,
    html: string,
    fullHtml?: string,
    css?: string,
    templateId?: string,
    customFileName?: string,
    styleConfig?: ResumeStyleConfig,
  ) {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // If fullHtml is provided, it's a complete document — skip base styles to avoid duplication.
    // Otherwise, wrap body-only HTML with base styles + template CSS.
    const finalHtml = fullHtml
      ? buildResumeHtmlDocument({ contentHtml: fullHtml, templateCss: css, skipBaseStyles: true })
      : buildResumeHtmlDocument({ contentHtml: html, templateCss: css, styleConfig });

    this.logger.log('Launching Puppeteer to generate PDF from custom HTML');

    try {
      const pdfBuffer = await this.renderPdf(finalHtml);

      // Upload PDF to S3
      let fileName =
        customFileName ||
        `${profile.firstName || 'Resume'}_${profile.lastName || ''}_${Date.now()}.pdf`.replace(
          /\s+/g,
          '_',
        );
      // Ensure fileName always ends with .pdf so generateKey extracts the correct extension
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName = fileName.replace(/\s+/g, '_') + '.pdf';
      }
      const key = this.s3Service.generateKey('resumes', fileName);
      const uploadResult = await this.s3Service.upload(key, pdfBuffer, 'application/pdf');

      this.logger.log(`Custom template PDF uploaded to S3: ${uploadResult.url}`);

      // Save to database
      await this.db
        .update(resumes)
        .set({ isDefault: false })
        .where(eq(resumes.profileId, profile.id));

      const [resume] = await this.db
        .insert(resumes)
        .values({
          profileId: profile.id,
          templateId: templateId || null,
          fileName: fileName,
          filePath: uploadResult.url,
          fileSize: pdfBuffer.length,
          fileType: 'pdf',
          resumeName: templateId ? 'Generated from custom template' : 'Custom resume',
          isDefault: false,
          isBuiltWithBuilder: true,
        })
        .returning();

      // Update onboarding
      await updateOnboardingStep(this.db, userId, 1);
      await recalculateOnboardingCompletion(this.db, userId);

      // Return download URL
      const downloadKey = this.s3Service.extractKeyFromUrl(uploadResult.url);
      const downloadUrl = await this.s3Service.getSignedDownloadUrl(downloadKey, 3600);

      return {
        resumeId: resume.id,
        pdfUrl: uploadResult.url,
        downloadUrl,
        fileName,
      };
    } catch (error) {
      this.logger.error('Failed to generate PDF from custom HTML', error);
      throw new BadRequestException('Failed to generate PDF');
    }
  }
}
