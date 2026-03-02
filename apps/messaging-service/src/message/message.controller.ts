import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Send a message in a thread',
    description: `Sends a new message inside an existing thread. The recipient is automatically determined from the thread participants.

**Integration flow:**
1. User types message in the chat input and clicks send
2. Call this API with the threadId and message body
3. The API creates the message with status "sent"
4. If the recipient is online (connected via WebSocket), they receive it in real-time and status auto-updates to "delivered"
5. A push notification is also sent via SQS to the notification service

**Note:** For real-time messaging, prefer using the WebSocket \`send_message\` event instead of this REST endpoint.`,
  })
  @ApiParam({
    name: 'threadId',
    description: 'Thread UUID',
    example: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message created and sent',
    schema: {
      example: {
        id: 'f6a7b8c9-d0e1-2345-fa67-890123456789',
        threadId: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
        senderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        recipientId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
        subject: 'Interview scheduling',
        body: 'Hi, when can we schedule the interview? I am available next week.',
        attachments: null,
        status: 'sent',
        isRead: false,
        readAt: null,
        deliveredAt: null,
        createdAt: '2026-02-27T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to send in this thread' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.messageService.sendMessage(userId, threadId, dto);
    return { message: 'Message sent successfully', data: message };
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({
    summary: 'Get messages in a thread (paginated)',
    description: `Returns paginated messages for a thread, ordered by newest first.
Each message includes enriched sender and recipient profiles (name + photo).

**Integration flow:**
1. Call when user opens a conversation thread
2. Render messages as chat bubbles — compare \`senderId\` with current userId to decide left/right alignment
3. Use \`status\` field for checkmarks: "sent" = single check, "delivered" = double grey, "read" = double green
4. Use \`sender.profilePhoto\` for avatar next to received messages
5. Group messages by date using \`createdAt\` for date separators ("Today", "Yesterday")
6. Use \`?unreadOnly=true\` to fetch only unread messages
7. Load more with \`?page=2&limit=50\``,
  })
  @ApiParam({
    name: 'threadId',
    description: 'Thread UUID',
    example: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated messages with sender/recipient profiles',
    schema: {
      example: {
        data: [
          {
            id: 'aaa11111-2222-3333-4444-555566667777',
            threadId: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
            senderId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
            recipientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            subject: null,
            body: 'We are arriving today at 01:45, will someone be at home?',
            attachments: null,
            status: 'read',
            isRead: true,
            readAt: '2026-02-27T09:40:00.000Z',
            deliveredAt: '2026-02-27T09:37:05.000Z',
            createdAt: '2026-02-27T09:37:00.000Z',
            sender: {
              id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
              firstName: 'Ahmed',
              lastName: 'Anjims',
              profilePhoto: 'https://s3.amazonaws.com/photos/ahmed.jpg',
            },
            recipient: {
              id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              firstName: 'Jan',
              lastName: 'Mayer',
              profilePhoto: null,
            },
          },
          {
            id: 'bbb22222-3333-4444-5555-666677778888',
            threadId: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
            senderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            recipientId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
            subject: null,
            body: 'I will be at home',
            attachments: null,
            status: 'delivered',
            isRead: false,
            readAt: null,
            deliveredAt: '2026-02-27T09:39:05.000Z',
            createdAt: '2026-02-27T09:39:00.000Z',
            sender: {
              id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              firstName: 'Jan',
              lastName: 'Mayer',
              profilePhoto: null,
            },
            recipient: {
              id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
              firstName: 'Ahmed',
              lastName: 'Anjims',
              profilePhoto: 'https://s3.amazonaws.com/photos/ahmed.jpg',
            },
          },
        ],
        meta: { total: 15, page: 1, limit: 50, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view messages' })
  async getMessages(
    @CurrentUser('sub') userId: string,
    @Param('threadId') threadId: string,
    @Query() query: MessageQueryDto,
  ) {
    const result = await this.messageService.getMessages(userId, threadId, query);
    return { message: 'Messages fetched successfully', ...result };
  }

  @Post('mark-read')
  @ApiOperation({
    summary: 'Mark specific messages as read (batch)',
    description: `Marks a list of messages as read. Only messages where the current user is the recipient will be updated.
Updates both \`isRead\` to true and \`status\` to "read".

**Integration flow:**
1. When user scrolls through messages and sees unread ones, collect their IDs
2. Send all visible unread message IDs in a single batch call
3. For real-time, prefer the WebSocket \`mark_read\` event — it also notifies the sender with a read receipt`,
  })
  @ApiBody({ type: MarkReadDto })
  @ApiResponse({
    status: 200,
    description: 'Number of messages updated',
    schema: { example: { updated: 3 } },
  })
  async markAsRead(@CurrentUser('sub') userId: string, @Body() dto: MarkReadDto) {
    const result = await this.messageService.markAsRead(userId, dto);
    return { message: 'Messages marked as read', data: result };
  }

  @Post('threads/:threadId/mark-read')
  @ApiOperation({
    summary: 'Mark ALL messages in a thread as read',
    description: `Convenience endpoint to mark all unread messages in a thread as read at once.
Use this when a user opens a conversation — it clears the unread count for that thread.

**Integration flow:**
1. Call when user opens/enters a thread
2. This clears the unread badge for this thread
3. If using WebSocket, also emit \`mark_read\` so the sender gets the read receipt in real-time`,
  })
  @ApiParam({
    name: 'threadId',
    description: 'Thread UUID',
    example: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'All thread messages marked as read',
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async markThreadAsRead(@CurrentUser('sub') userId: string, @Param('threadId') threadId: string) {
    await this.messageService.markThreadAsRead(userId, threadId);
    return { message: 'Thread messages marked as read', data: {} };
  }

  @Get('unread/count')
  @ApiOperation({
    summary: 'Get total unread message count for current user',
    description: `Returns the total number of unread messages across all threads.
Use this to show the unread badge count on the Messages tab in the bottom navigation.

**Integration flow:**
1. Call on app load / when switching to messages tab
2. Display the count as a badge on the "Message" nav icon
3. Update in real-time by listening to WebSocket \`new_message\` events and incrementing locally`,
  })
  @ApiResponse({
    status: 200,
    description: 'Total unread count',
    schema: { example: { unreadCount: 7 } },
  })
  async getUnreadCount(@CurrentUser('sub') userId: string) {
    const result = await this.messageService.getUnreadCount(userId);
    return { message: 'Unread count fetched successfully', data: result };
  }
}
