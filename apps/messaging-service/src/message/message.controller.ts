import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { MessageService } from './message.service';
import { SendMessageDto, MessageQueryDto, MarkReadDto } from './dto';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('threads/:threadId/messages')
  @ApiOperation({ summary: 'Send a message in a thread' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(userId, threadId, dto);
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get messages in a thread' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'List of messages with pagination' })
  getMessages(
    @CurrentUser('sub') userId: string,
    @Param('threadId') threadId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.messageService.getMessages(userId, threadId, query);
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark specific messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  markAsRead(@CurrentUser('sub') userId: string, @Body() dto: MarkReadDto) {
    return this.messageService.markAsRead(userId, dto);
  }

  @Post('threads/:threadId/mark-read')
  @ApiOperation({ summary: 'Mark all messages in thread as read' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'All thread messages marked as read' })
  markThreadAsRead(
    @CurrentUser('sub') userId: string,
    @Param('threadId') threadId: string,
  ) {
    return this.messageService.markThreadAsRead(userId, threadId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@CurrentUser('sub') userId: string) {
    return this.messageService.getUnreadCount(userId);
  }
}
