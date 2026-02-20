import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@ai-job-portal/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { FastifyRequest } from 'fastify';
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
  // Step 6: Company Details & Complete Registration
  // ============================================

  @Post('complete')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 6: Submit company details and complete registration',
    description: `
      Final step - submits company details, creates all records, and returns authentication tokens.
      Supports multipart/form-data for GST document upload, or JSON without file.

      **What happens:**
      1. Validates all previous steps are complete
      2. Uploads GST document to S3 (if provided)
      3. Creates Cognito user account (auto-confirmed since email already verified)
      4. Creates user record with role 'employer'
      5. Creates employer profile
      6. Creates company record (verification status: pending)
      7. Links employer to company
      8. Returns JWT access & refresh tokens

      **Multipart Form Fields:**
      - sessionToken (required): Registration session token
      - companyName (required): Company legal name
      - panNumber (required): PAN number
      - gstNumber (required): GST registration number
      - cinNumber (required): Corporate Identification Number
      - gstDocument (optional): GST certificate file (JPG, PNG, PDF, DOC, DOCX, max 10MB)
    `,
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionToken: {
          type: 'string',
          description: 'Registration session token from previous steps',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
        companyName: {
          type: 'string',
          description: 'Company legal name',
          example: 'TechCorp Solutions Pvt Ltd',
        },
        panNumber: {
          type: 'string',
          description: 'PAN number of the company',
          example: 'ABCDE1234F',
        },
        gstNumber: {
          type: 'string',
          description: 'GST registration number',
          example: '29AABCI1234A1Z5',
        },
        cinNumber: {
          type: 'string',
          description: 'Corporate Identification Number',
          example: 'U72200KA2020PTC123456',
        },
        gstDocument: {
          type: 'string',
          format: 'binary',
          description: 'GST certificate document (JPG, PNG, PDF, DOC, DOCX, max 10MB)',
        },
      },
      required: ['sessionToken', 'companyName', 'panNumber', 'gstNumber', 'cinNumber'],
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
    description: 'Previous steps not completed / Invalid data / File validation failed',
  })
  @ApiResponse({ status: 409, description: 'Email or mobile already registered (race condition)' })
  async completeRegistration(@Req() req: FastifyRequest) {
    this.logger.info('Company registration - Complete registration', 'CompanyRegistration');

    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form with optional GST document
      const parts = req.parts();
      const fields: Record<string, string> = {};
      let gstDocumentFile:
        | {
            buffer: Buffer;
            originalname: string;
            mimetype: string;
            size: number;
          }
        | undefined;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'gstDocument') {
            const buffer = await part.toBuffer();
            gstDocumentFile = {
              buffer,
              originalname: part.filename,
              mimetype: part.mimetype,
              size: buffer.length,
            };
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }

      if (
        !fields.sessionToken ||
        !fields.companyName ||
        !fields.panNumber ||
        !fields.gstNumber ||
        !fields.cinNumber
      ) {
        throw new BadRequestException(
          'Missing required fields: sessionToken, companyName, panNumber, gstNumber, cinNumber',
        );
      }

      return this.companyRegistrationService.completeRegistration(
        fields.sessionToken,
        fields.companyName,
        fields.panNumber,
        fields.gstNumber,
        fields.cinNumber,
        gstDocumentFile,
      );
    } else {
      // Handle JSON request (no file upload)
      const body = req.body as any;

      if (
        !body?.sessionToken ||
        !body?.companyName ||
        !body?.panNumber ||
        !body?.gstNumber ||
        !body?.cinNumber
      ) {
        throw new BadRequestException(
          'Missing required fields: sessionToken, companyName, panNumber, gstNumber, cinNumber',
        );
      }

      return this.companyRegistrationService.completeRegistration(
        body.sessionToken,
        body.companyName,
        body.panNumber,
        body.gstNumber,
        body.cinNumber,
      );
    }
  }
}
