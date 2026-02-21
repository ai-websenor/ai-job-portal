import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { CompanyService } from './company.service';
import { UpdateCompanyDto, VerificationDocUploadUrlDto, VerificationDocConfirmDto } from './dto';

@ApiTags('Company-Employer')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_employer', 'employer')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('profile')
  @Roles('super_employer')
  @ApiOperation({
    summary: 'Get company profile',
    description: `Get the company profile for the authenticated super_employer.
      Sensitive fields (PAN, GST, CIN) are masked for security.`,
  })
  @ApiResponse({ status: 200, description: 'Company profile retrieved successfully' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'Employer profile or company not found' })
  async getCompanyProfile(@CurrentUser('sub') userId: string) {
    const company = await this.companyService.getCompanyProfile(userId);
    return { message: 'Company profile fetched successfully', data: company };
  }

  @Put('profile')
  @Roles('super_employer')
  @ApiOperation({
    summary: 'Update company profile',
    description: `Update the company profile for the authenticated super_employer.

      **Allowed fields:**
      - name, industry, companySize, companyType, yearEstablished
      - website, description, mission, culture, benefits, tagline
      - headquarters, employeeCount, social media URLs
      - bannerUrl, isActive

      **Restricted fields (cannot be edited):**
      - panNumber, gstNumber, cinNumber (business registration numbers)
      - logoUrl (use dedicated logo upload endpoint)
      - verificationDocuments, kycDocuments (managed by super_admin)
      - isVerified, verificationStatus (managed by super_admin)`,
  })
  @ApiResponse({ status: 200, description: 'Company profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'Employer profile or company not found' })
  async updateCompanyProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateCompanyDto) {
    const company = await this.companyService.updateCompanyProfile(userId, dto);
    return { message: 'Company profile updated successfully', data: company };
  }

  // ========================================
  // COMPANY FILE UPLOAD ENDPOINTS
  // Company is auto-resolved from the authenticated employer's record
  // ========================================

  @Post('logo')
  @ApiOperation({
    summary: 'Upload company logo (JPEG, PNG, WebP, max 2MB)',
    description:
      "Uploads a logo for the employer's company. The company is automatically resolved from the authenticated user's employer profile.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'Employer profile not found' })
  async uploadLogo(@CurrentUser('sub') userId: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.companyService.uploadLogo(userId, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    });
  }

  @Post('banner')
  @ApiOperation({
    summary: 'Upload company banner (JPEG, PNG, WebP, max 5MB)',
    description:
      "Uploads a banner for the employer's company. The company is automatically resolved from the authenticated user's employer profile.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Banner uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'Employer profile not found' })
  async uploadBanner(@CurrentUser('sub') userId: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.companyService.uploadBanner(userId, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    });
  }

  @Post('verification-document/upload-url')
  @ApiOperation({
    summary: 'Get pre-signed URL for uploading verification document',
    description: `Returns a pre-signed S3 PUT URL for direct client-side upload of a business verification document (KYC/PAN/GST).
The company is automatically resolved from the authenticated user's employer profile.

**Allowed file types:** JPG, PNG, PDF, DOC, DOCX (max 10MB)

**Flow:**
1. Call this endpoint with filename and contentType
2. Upload the file directly to S3 using the returned \`uploadUrl\` (PUT request)
3. Call \`POST /company/verification-document/confirm\` with the returned \`key\` to finalize`,
  })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed upload URL generated',
    schema: {
      example: {
        uploadUrl:
          'https://s3.amazonaws.com/bucket/company-verification-docs/...?X-Amz-Signature=...',
        key: 'company-verification-docs/1234567890-abc123.pdf',
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid content type' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  async getVerificationDocUploadUrl(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerificationDocUploadUrlDto,
  ) {
    return this.companyService.generateVerificationDocUploadUrl(
      userId,
      dto.filename,
      dto.contentType,
    );
  }

  @Post('verification-document/confirm')
  @ApiOperation({
    summary: 'Confirm verification document upload',
    description: `After uploading the file to S3 using the pre-signed URL, call this endpoint to confirm the upload and save the document reference in the database.
The company is automatically resolved from the authenticated user's employer profile.

The server verifies the file exists in S3 before updating the record.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification document confirmed',
    schema: {
      example: {
        verificationDocuments: 'company-verification-docs/1234567890-abc123.pdf',
        kycDocuments: true,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Document not found in storage or invalid key' })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  async confirmVerificationDocUpload(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerificationDocConfirmDto,
  ) {
    return this.companyService.confirmVerificationDocUpload(userId, dto.key);
  }

  @Get('verification-document/url')
  @ApiOperation({
    summary: 'Get pre-signed URL for verification document',
    description:
      "Returns a temporary pre-signed URL to view the verification document inline in the browser. The company is automatically resolved from the authenticated user's employer profile. The URL expires in 1 hour.",
  })
  @ApiResponse({
    status: 200,
    description: 'Document URL generated',
    schema: {
      example: {
        url: 'https://s3.amazonaws.com/bucket/company-verification-docs/...?X-Amz-Signature=...',
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'No verification document found' })
  async getVerificationDocUrl(@CurrentUser('sub') userId: string) {
    return this.companyService.getVerificationDocUrl(userId);
  }
}
