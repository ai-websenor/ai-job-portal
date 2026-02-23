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

@ApiTags('company-employer')
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
    summary: 'Upload or update company logo (JPEG, PNG, WebP, max 2MB)',
    description: `Upload or replace the company logo. If a logo already exists, the old file is automatically deleted from S3 before uploading the new one.
The company is automatically resolved from the authenticated user's employer profile.

**Supported formats:** JPEG, PNG, WebP
**Max file size:** 2MB

**Example usage (multipart/form-data):**
\`\`\`
curl -X POST /api/v1/company/logo \\
  -H "Authorization: Bearer <token>" \\
  -F "file=@company-logo.png"
\`\`\``,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Logo uploaded/updated successfully',
    schema: {
      example: {
        logoUrl: 'https://s3.ap-south-1.amazonaws.com/bucket/company-logos/1234567890-logo.png',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size exceeds 2MB' })
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
    summary: 'Upload or update company banner (JPEG, PNG, WebP, max 5MB)',
    description: `Upload or replace the company banner. If a banner already exists, the old file is automatically deleted from S3 before uploading the new one.
The company is automatically resolved from the authenticated user's employer profile.

**Supported formats:** JPEG, PNG, WebP
**Max file size:** 5MB

**Example usage (multipart/form-data):**
\`\`\`
curl -X POST /api/v1/company/banner \\
  -H "Authorization: Bearer <token>" \\
  -F "file=@company-banner.jpg"
\`\`\``,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Banner uploaded/updated successfully',
    schema: {
      example: {
        bannerUrl:
          'https://s3.ap-south-1.amazonaws.com/bucket/company-banners/1234567890-banner.jpg',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size exceeds 5MB' })
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
    summary: 'Get pre-signed URL for uploading or updating GST document',
    description: `Returns a pre-signed S3 PUT URL for direct client-side upload of the GST certificate document.
This endpoint works for both **initial upload** and **re-upload/update**. The company is automatically resolved from the authenticated user's employer profile.

**Allowed file types:** JPG, PNG, PDF, DOC, DOCX (max 10MB)

**Flow:**
1. Call this endpoint with filename and contentType
2. Upload the file directly to S3 using the returned \`uploadUrl\` (PUT request with file as body)
3. Call \`POST /company/verification-document/confirm\` with the returned \`key\` to finalize

**Example:**
\`\`\`
// Step 1: Get upload URL
POST /api/v1/company/verification-document/upload-url
Body: { "filename": "gst-certificate.pdf", "contentType": "application/pdf" }
Response: { "uploadUrl": "https://s3...", "key": "company-gst-documents/...", "expiresIn": 3600 }

// Step 2: Upload file directly to S3
PUT <uploadUrl>
Headers: Content-Type: application/pdf
Body: <file binary>

// Step 3: Confirm upload
POST /api/v1/company/verification-document/confirm
Body: { "key": "company-gst-documents/..." }
\`\`\``,
  })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed upload URL generated',
    schema: {
      example: {
        uploadUrl:
          'https://s3.ap-south-1.amazonaws.com/bucket/company-gst-documents/1708500000000-abc123.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...',
        key: 'company-gst-documents/1708500000000-abc123.pdf',
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
    summary: 'Confirm GST document upload',
    description: `After uploading the file to S3 using the pre-signed URL, call this endpoint to confirm the upload and save the document reference in the database.
The company is automatically resolved from the authenticated user's employer profile.

If a GST document already exists, the old file is automatically deleted from S3.
The server verifies the new file exists in S3 before updating the record.

**Example:**
\`\`\`
POST /api/v1/company/verification-document/confirm
Body: { "key": "company-gst-documents/1708500000000-abc123.pdf" }
Response: { "gstDocumentUrl": "https://s3.../company-gst-documents/...", "kycDocuments": true }
\`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'GST document confirmed and saved',
    schema: {
      example: {
        gstDocumentUrl:
          'https://s3.ap-south-1.amazonaws.com/bucket/company-gst-documents/1708500000000-abc123.pdf',
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
    summary: 'Get pre-signed URL to view GST document',
    description: `Returns a temporary pre-signed URL to view the GST document inline in the browser.
The company is automatically resolved from the authenticated user's employer profile. The URL expires in 1 hour.

**Example:**
\`\`\`
GET /api/v1/company/verification-document/url
Response: { "url": "https://s3...?X-Amz-Signature=...", "expiresIn": 3600 }
\`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Document preview URL generated',
    schema: {
      example: {
        url: 'https://s3.ap-south-1.amazonaws.com/bucket/company-gst-documents/1708500000000-abc123.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...',
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No company assigned to this employer' })
  @ApiResponse({ status: 404, description: 'No GST document found for this company' })
  async getVerificationDocUrl(@CurrentUser('sub') userId: string) {
    return this.companyService.getVerificationDocUrl(userId);
  }
}
