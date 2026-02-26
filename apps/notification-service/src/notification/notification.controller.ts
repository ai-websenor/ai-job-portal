import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { CurrentUser } from '@ai-job-portal/common';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

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
