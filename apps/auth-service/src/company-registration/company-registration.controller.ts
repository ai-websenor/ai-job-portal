import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@ai-job-portal/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { CompanyRegistrationService } from './company-registration.service';
import {
  SendMobileOtpDto,
  SendMobileOtpResponseDto,
  VerifyMobileOtpDto,
  VerifyMobileOtpResponseDto,
  SendEmailOtpDto,
  SendEmailOtpResponseDto,
  VerifyEmailOtpDto,
  VerifyEmailOtpResponseDto,
  BasicDetailsDto,
  BasicDetailsResponseDto,
  GstDocumentUploadUrlDto,
  CompanyDetailsDto,
  CompanyRegistrationCompleteResponseDto,
} from './dto';

@ApiTags('company')
@Controller('company/register')
export class CompanyRegistrationController {
  private readonly logger = new CustomLogger();

  constructor(private readonly companyRegistrationService: CompanyRegistrationService) {}

  // ============================================
  // Step 1: Send Mobile OTP
  // ============================================

  @Post('send-mobile-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 1: Send OTP to mobile number',
    description: `
      First step of company registration. Sends a 6-digit OTP to the provided mobile number via SMS.
      Returns a sessionToken that must be used in all subsequent steps.

      **Flow:**
      1. Validates mobile number format (E.164)
      2. Checks if mobile is already registered
      3. Generates OTP and creates registration session (30-min expiry)
      4. Sends OTP via SMS

      **Note:** In development mode, OTP is always '123456' and returned in response.
    `,
  })
  @ApiBody({
    type: SendMobileOtpDto,
    examples: {
      india: {
        summary: 'Indian mobile number',
        value: { mobile: '+919876543210' },
      },
      us: {
        summary: 'US mobile number',
        value: { mobile: '+12025551234' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: SendMobileOtpResponseDto,
    description: 'OTP sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid mobile number format' })
  @ApiResponse({ status: 409, description: 'Mobile number already registered' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limited' })
  async sendMobileOtp(@Body() dto: SendMobileOtpDto): Promise<SendMobileOtpResponseDto> {
    this.logger.info('Company registration - Send mobile OTP', 'CompanyRegistration', {
      mobile: dto.mobile,
    });
    return this.companyRegistrationService.sendMobileOtp(dto);
  }

  // ============================================
  // Step 2: Verify Mobile OTP
  // ============================================

  @Post('verify-mobile-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 2: Verify mobile OTP',
    description: `
      Verifies the 6-digit OTP sent to the mobile number in Step 1.
      Requires the sessionToken from Step 1.

      **Flow:**
      1. Validates session exists and is not expired
      2. Verifies OTP matches
      3. Marks mobile as verified in session
    `,
  })
  @ApiBody({
    type: VerifyMobileOtpDto,
    examples: {
      default: {
        summary: 'Verify OTP',
        value: {
          sessionToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          otp: '123456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: VerifyMobileOtpResponseDto,
    description: 'Mobile verified successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP / Invalid session' })
  async verifyMobileOtp(@Body() dto: VerifyMobileOtpDto): Promise<VerifyMobileOtpResponseDto> {
    this.logger.info('Company registration - Verify mobile OTP', 'CompanyRegistration');
    return this.companyRegistrationService.verifyMobileOtp(dto);
  }

  // ============================================
  // Step 3: Send Email OTP
  // ============================================

  @Post('send-email-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 3: Send OTP to email address',
    description: `
      Sends a 6-digit OTP to the provided email address.
      Mobile number must be verified (Step 2) before this step.
      Company domain email is preferred (e.g., hr@yourcompany.com).

      **Flow:**
      1. Validates session and mobile verification
      2. Checks if email is already registered
      3. Generates OTP and sends via email
    `,
  })
  @ApiBody({
    type: SendEmailOtpDto,
    examples: {
      corporate: {
        summary: 'Corporate email',
        value: {
          sessionToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'hr@techcorp.com',
        },
      },
      personal: {
        summary: 'Personal email',
        value: {
          sessionToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'rajesh.kumar@gmail.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: SendEmailOtpResponseDto,
    description: 'OTP sent to email',
  })
  @ApiResponse({ status: 400, description: 'Mobile not verified / Invalid session' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async sendEmailOtp(@Body() dto: SendEmailOtpDto): Promise<SendEmailOtpResponseDto> {
    this.logger.info('Company registration - Send email OTP', 'CompanyRegistration', {
      email: dto.email,
    });
    return this.companyRegistrationService.sendEmailOtp(dto);
  }

  // ============================================
  // Step 4: Verify Email OTP
  // ============================================

  @Post('verify-email-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 4: Verify email OTP',
    description: `
      Verifies the 6-digit OTP sent to the email in Step 3.

      **Flow:**
      1. Validates session and step progression
      2. Verifies OTP matches
      3. Marks email as verified in session
    `,
  })
  @ApiBody({
    type: VerifyEmailOtpDto,
    examples: {
      default: {
        summary: 'Verify email OTP',
        value: {
          sessionToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          otp: '654321',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: VerifyEmailOtpResponseDto,
    description: 'Email verified successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP / Invalid session' })
  async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto): Promise<VerifyEmailOtpResponseDto> {
    this.logger.info('Company registration - Verify email OTP', 'CompanyRegistration');
    return this.companyRegistrationService.verifyEmailOtp(dto);
  }

  // ============================================
  // Step 5: Basic Details
  // ============================================

  @Post('basic-details')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 5: Submit basic user details',
    description: `
      Submits the employer's personal details. Both mobile and email must be verified.

      **Account Types:**
      - \`direct_employer\` - Company hiring directly
      - \`recruitment_agency\` - Recruitment/placement agency
      - \`staffing_company\` - Staffing/manpower company
      - \`consultancy\` - HR/recruitment consultancy

      **Flow:**
      1. Validates session (mobile & email verified)
      2. Validates password match
      3. Stores details in registration session
    `,
  })
  @ApiBody({
    type: BasicDetailsDto,
    examples: {
      default: {
        summary: 'Employer basic details',
        value: {
          sessionToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          accountType: 'direct_employer',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          password: 'SecureP@ss123',
          confirmPassword: 'SecureP@ss123',
          country: 'India',
          state: 'Karnataka',
          city: 'Bangalore',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: BasicDetailsResponseDto,
    description: 'Basic details saved',
  })
  @ApiResponse({ status: 400, description: 'Verification not complete / Passwords do not match' })
  async submitBasicDetails(@Body() dto: BasicDetailsDto): Promise<BasicDetailsResponseDto> {
    this.logger.info('Company registration - Submit basic details', 'CompanyRegistration');
    return this.companyRegistrationService.submitBasicDetails(dto);
  }

  // ============================================
  // Step 6a: GST Document Upload (Pre-signed URL)
  // ============================================

  @Post('gst-document/upload-url')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 6a: Get pre-signed URL for uploading GST document',
    description: `
      Returns a pre-signed S3 PUT URL for direct client-side upload of the GST certificate document.
      Requires a valid registration session (Step 5 must be complete).

      **Allowed file types:** JPG, PNG, PDF, DOC, DOCX (max 10MB)

      **Flow:**
      1. Call this endpoint with sessionToken, fileName, and contentType
      2. Upload the file directly to S3 using the returned \`uploadUrl\` (PUT request)
      3. Pass the returned \`key\` in the \`gstDocumentKey\` field when calling \`POST /company/register/complete\`
    `,
  })
  @ApiBody({
    type: GstDocumentUploadUrlDto,
    examples: {
      default: {
        summary: 'GST document upload URL request',
        value: {
          sessionToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          fileName: 'gst-certificate.pdf',
          contentType: 'application/pdf',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed upload URL generated',
    schema: {
      example: {
        uploadUrl: 'https://s3.amazonaws.com/bucket/company-gst-documents/...?X-Amz-Signature=...',
        key: 'company-gst-documents/1234567890-abc123.pdf',
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid content type or previous steps not complete' })
  async getGstDocumentUploadUrl(@Body() dto: GstDocumentUploadUrlDto) {
    this.logger.info('Company registration - GST document upload URL', 'CompanyRegistration');
    return this.companyRegistrationService.getGstDocumentUploadUrl(
      dto.sessionToken,
      dto.fileName,
      dto.contentType,
    );
  }

  // ============================================
  // Step 6b: Company Details & Complete Registration
  // ============================================

  @Post('complete')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 6b: Submit company details and complete registration',
    description: `
      Final step - submits company details, creates all records, and returns authentication tokens.

      **What happens:**
      1. Validates all previous steps are complete
      2. Verifies GST document exists in S3 (if gstDocumentKey provided)
      3. Creates Cognito user account (auto-confirmed since email already verified)
      4. Creates user record with role 'super_employer'
      5. Creates employer profile
      6. Creates company record (verification status: pending)
      7. Links employer to company
      8. Returns JWT access & refresh tokens

      **GST Document Upload (before calling this endpoint):**
      1. \`POST /company/register/gst-document/upload-url\` - Get upload URL
      2. Upload file directly to S3 using the returned URL
      3. Include the returned \`key\` as \`gstDocumentKey\` in this request
    `,
  })
  @ApiBody({
    type: CompanyDetailsDto,
    examples: {
      default: {
        summary: 'Company details with GST document',
        value: {
          sessionToken: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          companyName: 'TechCorp Solutions Pvt Ltd',
          panNumber: 'ABCDE1234F',
          gstNumber: '29AABCI1234A1Z5',
          cinNumber: 'U72200KA2020PTC123456',
          gstDocumentKey: 'company-gst-documents/1234567890-abc123.pdf',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    type: CompanyRegistrationCompleteResponseDto,
    description:
      'Company registration completed successfully. Returns auth tokens and company details.',
  })
  @ApiResponse({
    status: 400,
    description: 'Previous steps not completed / Invalid data / GST document not found in S3',
  })
  @ApiResponse({ status: 409, description: 'Email or mobile already registered (race condition)' })
  async completeRegistration(@Body() dto: CompanyDetailsDto) {
    this.logger.info('Company registration - Complete registration', 'CompanyRegistration');

    return this.companyRegistrationService.completeRegistration(
      dto.sessionToken,
      dto.companyName,
      dto.panNumber,
      dto.gstNumber,
      dto.cinNumber,
      dto.gstDocumentKey,
    );
  }
}
