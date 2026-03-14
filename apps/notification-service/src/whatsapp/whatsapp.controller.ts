import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { eq } from 'drizzle-orm';
import { Database, users } from '@ai-job-portal/database';
import { WhatsAppService } from './whatsapp.service';
import { PreferenceService } from '../preference/preference.service';
import { CurrentUser } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';

class SendWhatsAppDto {
  @ApiProperty({
    description: 'Recipient phone number with country code (e.g. +919876543210)',
    example: '+919876543210',
  })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description:
      'Free-form text message. Only works within 24h customer service window (recipient must message you first).',
    required: false,
    example: 'Hello! This is a test message from AI Job Portal.',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    description:
      'Template name to send (must be approved in Meta Business Manager). Use "hello_world" for quick connectivity test.',
    required: false,
    example: 'hello_world',
  })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiProperty({
    description: 'Language code for template message',
    required: false,
    default: 'en_US',
    example: 'en_US',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;
}

class TestCandidateDto {
  @ApiProperty({
    description: 'The notification type to simulate',
    enum: ['job_alert', 'interview_scheduled', 'application_update'],
    example: 'interview_scheduled',
  })
  @IsNotEmpty()
  @IsString()
  type: 'job_alert' | 'interview_scheduled' | 'application_update';

  @ApiProperty({ description: 'Job title for the notification', example: 'Senior React Developer' })
  @IsNotEmpty()
  @IsString()
  jobTitle: string;

  @ApiProperty({ description: 'Company name', example: 'Acme Corp' })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'Meeting link (only for interview_scheduled type)',
    required: false,
    example: 'https://zoom.us/j/123456789',
  })
  @IsOptional()
  @IsString()
  meetingLink?: string;
}

class BroadcastWhatsAppDto {
  @ApiProperty({
    description: 'Array of recipient phone numbers with country code',
    example: ['+919876543210', '+919123456789'],
  })
  @IsArray()
  phoneNumbers: string[];

  @ApiProperty({
    description:
      'Template name to broadcast (must be approved in Meta Business Manager). Use "hello_world" for testing.',
    example: 'hello_world',
  })
  @IsNotEmpty()
  @IsString()
  templateName: string;

  @ApiProperty({
    description: 'Language code for the template',
    required: false,
    default: 'en_US',
    example: 'en_US',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications/whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly preferenceService: PreferenceService,
    @Inject(DATABASE_CLIENT) private readonly db: Database,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a WhatsApp message to a specific number (testing only)',
    description: `Sends either a free-form text message or a template message to a phone number.

**Template mode** (recommended for testing): Set \`templateName\` to \`"hello_world"\` — this is pre-approved by Meta and works immediately with no extra setup.

**Text mode**: Set \`message\` field — only works within the 24-hour customer service window (recipient must have messaged your WhatsApp Business number first).`,
  })
  @ApiResponse({ status: 200, description: 'WhatsApp message result' })
  async sendMessage(@CurrentUser('sub') userId: string, @Body() dto: SendWhatsAppDto) {
    if (!dto.templateName && !dto.message) {
      return { success: false, error: 'Provide either message (text) or templateName (template)' };
    }

    if (dto.templateName) {
      return this.whatsAppService.sendTemplateMessage(
        userId,
        dto.phoneNumber,
        dto.templateName,
        dto.languageCode || 'en_US',
      );
    }

    return this.whatsAppService.sendTextMessage(userId, dto.phoneNumber, dto.message!);
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Broadcast a WhatsApp template message to multiple numbers (testing only)',
    description: `Sends a template message to all provided phone numbers in parallel and returns per-number results with aggregate stats.

Use \`templateName: "hello_world"\` for a quick connectivity test — it is pre-approved by Meta.`,
  })
  @ApiResponse({ status: 200, description: 'Broadcast results with per-number status' })
  async broadcast(@CurrentUser('sub') userId: string, @Body() dto: BroadcastWhatsAppDto) {
    const results = await Promise.allSettled(
      dto.phoneNumbers.map((phone) =>
        this.whatsAppService.sendTemplateMessage(
          userId,
          phone,
          dto.templateName,
          dto.languageCode || 'en_US',
        ),
      ),
    );

    const data = results.map((r, i) => ({
      phoneNumber: dto.phoneNumbers[i],
      ...(r.status === 'fulfilled' ? r.value : { success: false, error: String(r.reason) }),
    }));

    return {
      message: 'Broadcast completed',
      data,
      stats: {
        total: results.length,
        sent: data.filter((s) => s.success).length,
        failed: data.filter((s) => !s.success).length,
      },
    };
  }

  @Post('test-candidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate a WhatsApp notification for the logged-in candidate (testing only)',
    description: `Runs the **exact same checks** the real notification flow uses:
1. Checks if the candidate has a mobile number set
2. Checks if the mobile is verified
3. Checks if WhatsApp is enabled for the relevant notification category
4. Sends the WhatsApp if all checks pass

This lets you verify end-to-end that a candidate would actually receive WhatsApp notifications without needing to trigger a real job application or interview.`,
  })
  @ApiResponse({ status: 200, description: 'Diagnostic result with pass/fail for each check' })
  async testCandidateNotification(
    @CurrentUser('sub') userId: string,
    @Body() dto: TestCandidateDto,
  ) {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });

    const checks = {
      userFound: !!user,
      hasMobile: !!user?.mobile,
      isMobileVerified: !!user?.isMobileVerified,
      whatsappEnabled: false,
    };

    if (!user) {
      return { success: false, checks, reason: 'User not found' };
    }

    if (!user.mobile) {
      return {
        success: false,
        checks,
        reason: 'No mobile number on account. Update your profile with a mobile number.',
      };
    }

    if (!user.isMobileVerified) {
      return {
        success: false,
        checks,
        reason: 'Mobile number is not verified. Verify your mobile via OTP first.',
      };
    }

    const categoryMap: Record<string, 'jobAlerts' | 'applicationUpdates' | 'interviewReminders'> = {
      job_alert: 'jobAlerts',
      interview_scheduled: 'interviewReminders',
      application_update: 'applicationUpdates',
    };

    const category = categoryMap[dto.type];
    const { data: prefs } = await this.preferenceService.get(userId);
    const categoryPrefs = prefs[category] as any;
    checks.whatsappEnabled = categoryPrefs?.whatsapp === true;

    if (!checks.whatsappEnabled) {
      return {
        success: false,
        checks,
        reason: `WhatsApp is disabled for "${category}". Call PATCH /preferences/whatsapp with { "enabled": true } to enable.`,
      };
    }

    // All checks passed — send the actual WhatsApp
    let result: { success: boolean; messageId?: string; error?: string };

    if (dto.type === 'job_alert') {
      const withinLimit = await this.whatsAppService.checkDailyRateLimit(userId, 5);
      if (!withinLimit) {
        return {
          success: false,
          checks,
          reason: 'Daily WhatsApp job alert limit (5/day) reached for this candidate.',
        };
      }
      result = await this.whatsAppService.sendJobAlert(
        userId,
        user.mobile,
        dto.jobTitle,
        dto.companyName,
      );
    } else if (dto.type === 'interview_scheduled') {
      result = await this.whatsAppService.sendInterviewInvitation(
        userId,
        user.mobile,
        dto.jobTitle,
        dto.companyName,
        new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        dto.meetingLink,
      );
    } else {
      result = await this.whatsAppService.sendApplicationUpdate(
        userId,
        user.mobile,
        dto.jobTitle,
        'shortlisted',
      );
    }

    return {
      success: result.success,
      checks,
      phone: user.mobile,
      whatsappResult: result,
    };
  }
}
