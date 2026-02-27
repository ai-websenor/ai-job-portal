import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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
import { ThreadService } from './thread.service';
import { CreateThreadDto, ThreadQueryDto, UpdateThreadDto } from './dto';

@ApiTags('threads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages/threads')
export class ThreadController {
  constructor(private readonly threadService: ThreadService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new message thread or send to existing',
    description: `Creates a new conversation thread between the authenticated user and the recipient.
If a thread already exists between the same two users (for the same job/application), it reuses the existing thread and adds the message to it.

**Access rule:** A job application must exist between the candidate and the employer's job before either party can message. Either \`jobId\` or \`applicationId\` is required.

**Integration flow (Candidate side — "My Applications" screen):**
1. Candidate clicks "Message" button on their applied job card
2. Pass \`recipientId\` = employer's userId, \`jobId\` = the job UUID, \`body\` = message text
3. Optionally pass \`applicationId\` for direct application context

**Integration flow (Employer side — "Candidate Profile" screen):**
1. Employer clicks chat icon on a candidate who applied to their job
2. Pass \`recipientId\` = candidate's userId, \`jobId\` = the job UUID, \`body\` = message text
3. Optionally pass \`applicationId\` for direct application context

**Error cases:**
- 400 if neither \`jobId\` nor \`applicationId\` is provided
- 403 if no matching job application exists between the users
- 404 if the referenced job, application, or employer is not found`,
  })
  @ApiBody({ type: CreateThreadDto })
  @ApiResponse({
    status: 201,
    description: 'Thread created (or reused) with initial message',
    schema: {
      example: {
        thread: {
          id: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
          participants: [
            {
              id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              firstName: 'Jan',
              lastName: 'Mayer',
              profilePhoto: 'https://s3.amazonaws.com/photos/jan.jpg',
              isOnline: true,
            },
            {
              id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
              firstName: 'Ahmed',
              lastName: 'Anjims',
              profilePhoto: 'https://s3.amazonaws.com/photos/ahmed.jpg',
              isOnline: false,
            },
          ],
          jobId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
          applicationId: null,
          lastMessageAt: '2026-02-27T10:30:00.000Z',
          isArchived: false,
          createdAt: '2026-02-27T10:30:00.000Z',
        },
        message: {
          id: 'f6a7b8c9-d0e1-2345-fa67-890123456789',
          threadId: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
          senderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          recipientId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
          subject: 'Regarding React Developer position',
          body: 'Hi Ahmed, I saw your profile and would like to discuss the React Developer position.',
          attachments: null,
          status: 'sent',
          isRead: false,
          readAt: null,
          deliveredAt: null,
          createdAt: '2026-02-27T10:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request — jobId or applicationId is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — no job application exists between these users',
  })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateThreadDto) {
    return this.threadService.createThread(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all message threads for current user',
    description: `Returns a paginated list of conversation threads for the logged-in user.
Each thread includes enriched participant profiles (name, photo, online status), the last message preview, and unread count.

**Integration flow:**
1. Call this API when rendering the Messages inbox/list screen
2. Use \`participants\` array to display the other user's name, photo, and "Active Now" badge
3. Use \`lastMessage.body\` for message preview and \`lastMessageAt\` for relative timestamps
4. Use \`unreadCount > 0\` to show the blue unread dot indicator
5. Paginate with \`?page=1&limit=20\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated thread list with enriched participant data',
    schema: {
      example: {
        data: [
          {
            id: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
            participants: [
              {
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                firstName: 'Jan',
                lastName: 'Mayer',
                profilePhoto: 'https://s3.amazonaws.com/photos/jan.jpg',
                isOnline: true,
              },
              {
                id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
                firstName: 'Ahmed',
                lastName: 'Anjims',
                profilePhoto: null,
                isOnline: false,
              },
            ],
            jobId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
            applicationId: null,
            lastMessageAt: '2026-02-27T10:30:00.000Z',
            isArchived: false,
            createdAt: '2026-02-25T09:00:00.000Z',
            lastMessage: {
              id: 'f6a7b8c9-d0e1-2345-fa67-890123456789',
              body: 'We want to invite you for a quick interview...',
              senderId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
              createdAt: '2026-02-27T10:30:00.000Z',
              status: 'delivered',
            },
            unreadCount: 3,
          },
        ],
        meta: { total: 12, page: 1, limit: 20, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser('sub') userId: string, @Query() query: ThreadQueryDto) {
    return this.threadService.getThreads(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific thread by ID',
    description: `Returns a single thread with enriched participant profiles.
Use this when navigating into a specific conversation.

**Integration flow:**
1. Call when user taps on a thread from the list
2. Use the participant data to render the chat header (name, photo, "Active Now")
3. Then call GET /messages/threads/:id/messages to load the messages`,
  })
  @ApiParam({
    name: 'id',
    description: 'Thread UUID',
    example: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Thread details with enriched participants',
    schema: {
      example: {
        id: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
        participants: [
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            firstName: 'Jan',
            lastName: 'Mayer',
            profilePhoto: 'https://s3.amazonaws.com/photos/jan.jpg',
            isOnline: true,
          },
          {
            id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
            firstName: 'Ahmed',
            lastName: 'Anjims',
            profilePhoto: null,
            isOnline: true,
          },
        ],
        jobId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
        applicationId: null,
        lastMessageAt: '2026-02-27T10:30:00.000Z',
        isArchived: false,
        createdAt: '2026-02-25T09:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this thread' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.threadService.getThread(userId, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Archive or unarchive a thread',
    description: `Updates thread metadata. Currently supports toggling the archive flag.
Archived threads won't appear in the default thread list (use ?archived=true to see them).`,
  })
  @ApiParam({
    name: 'id',
    description: 'Thread UUID',
    example: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
  })
  @ApiBody({ type: UpdateThreadDto })
  @ApiResponse({ status: 200, description: 'Thread updated — returns updated thread object' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateThreadDto,
  ) {
    return this.threadService.updateThread(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete (archive) a thread',
    description: 'Archives the thread instead of permanently deleting it. Messages are preserved.',
  })
  @ApiParam({
    name: 'id',
    description: 'Thread UUID',
    example: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Thread archived',
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.threadService.deleteThread(userId, id);
  }
}
