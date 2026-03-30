import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { EmailService } from '../email/email.service';
import { CurrentUser } from '@ai-job-portal/common';

class TestEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsString()
  to!: string;

  @ApiProperty({
    required: false,
    description: 'Template key (default: WELCOME_CANDIDATE)',
  })
  @IsOptional()
  @IsString()
  templateKey?: string;
}

class TestPushDto {
  @ApiProperty({
    required: false,
    default: 'Test Notification',
    description: 'Notification title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    required: false,
    default: 'This notification is related to testing push notifications',
    description: 'Notification message',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  getNotifications(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationService.getUserNotifications(
      userId,
      Number(page) || 1,
      Number(limit) || 20,
      unreadOnly,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count' })
  getUnreadCount(@CurrentUser('sub') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark as read' })
  markAsRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationService.markAsRead(userId, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test email using a template (testing only)' })
  @ApiResponse({ status: 200, description: 'Test email sent' })
  sendTestEmail(@CurrentUser('sub') userId: string, @Body() dto: TestEmailDto) {
    const templateKey = dto.templateKey || 'WELCOME_CANDIDATE';
    return this.emailService.sendTemplatedEmail(userId, dto.to, templateKey, {
      firstName: 'Test User',
      jobTitle: 'Software Engineer',
      companyName: 'Test Company',
      status: 'Shortlisted',
      platformName: '',
      actionUrl: 'https://dev.d3tubn69g0t2tw.amplifyapp.com/dashboard',
    });
  }

  @Post('test-push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test push notification to logged-in user (testing only)' })
  @ApiResponse({ status: 200, description: 'Test push notification sent' })
  sendTestPush(@CurrentUser('sub') userId: string, @Body() dto: TestPushDto) {
    return this.notificationService.sendTestPushToUser(userId, dto.title, dto.message);
  }

  @Post('test-push-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Send test push notification to all registered candidates and employers (testing only)',
  })
  @ApiResponse({ status: 200, description: 'Test push notification sent to all users' })
  sendTestPushAll(@Body() dto: TestPushDto) {
    return this.notificationService.sendTestPushToAll(dto.title, dto.message);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationService.delete(userId, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  deleteAll(@CurrentUser('sub') userId: string) {
    return this.notificationService.deleteAll(userId);
  }
}
