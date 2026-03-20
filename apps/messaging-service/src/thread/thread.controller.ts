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
    summary: 'Send a message (creates thread if needed)',
    description: `**This is the primary endpoint for starting a conversation.** The frontend does NOT need to check if a thread exists first — this endpoint handles it automatically:
- If no thread exists → creates a new thread + sends the message
- If a thread already exists → reuses it + sends the message

The response includes \`isNew: true/false\` so the frontend knows whether a new thread was created.

**Access rule:** A job application must exist between the candidate and the employer's job before either party can message. \`applicationId\` is required.

**When to use which endpoint:**
| Scenario | Endpoint |
|---|---|
| User clicks "Message" from job card / candidate profile | \`POST /threads\` (this endpoint) |
| User sends follow-up messages inside an open chat | \`POST /threads/{threadId}/messages\` |

**Integration flow:**
1. User clicks "Message" button → call this API with \`recipientId\`, \`applicationId\`, and \`body\`
2. Response returns \`thread.id\` — store it for the chat screen
3. Navigate to chat screen → use \`thread.id\` for all subsequent calls:
   - \`GET /threads/{threadId}/messages\` to load chat history
   - \`POST /threads/{threadId}/messages\` to send follow-up messages

**Error cases:**
- 400 if \`applicationId\` is missing
- 403 if no matching job application exists between the users
- 404 if the referenced application, job, or employer is not found`,
  })
  @ApiBody({ type: CreateThreadDto })
  @ApiResponse({
    status: 201,
    description: 'Thread created (or reused) with message sent',
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
          applicationId: 'd4e5f6a7-b8c9-0123-defa-456789012345',
          lastMessageAt: '2026-02-27T10:30:00.000Z',
          isArchived: false,
          createdAt: '2026-02-27T10:30:00.000Z',
        },
        message: {
          id: 'f6a7b8c9-d0e1-2345-fa67-890123456789',
          threadId: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
          senderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          recipientId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
          body: 'Hi Ahmed, I saw your profile and would like to discuss the React Developer position.',
          attachments: null,
          status: 'sent',
          isRead: false,
          readAt: null,
          deliveredAt: null,
          createdAt: '2026-02-27T10:30:00.000Z',
        },
        isNew: true,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request — applicationId is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — no job application exists between these users',
  })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateThreadDto) {
    const result = await this.threadService.createThread(userId, dto);
    return { message: 'Thread created successfully', data: result };
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
            applicationId: 'd4e5f6a7-b8c9-0123-defa-456789012345',
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
  async findAll(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Query() query: ThreadQueryDto,
    @Query('scope') scope?: string,
  ) {
    const result = await this.threadService.getThreads(userId, query, userRole, scope);
    return { message: 'Threads fetched successfully', ...result };
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
        applicationId: 'd4e5f6a7-b8c9-0123-defa-456789012345',
        lastMessageAt: '2026-02-27T10:30:00.000Z',
        isArchived: false,
        createdAt: '2026-02-25T09:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this thread' })
  async findOne(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
  ) {
    const thread = await this.threadService.getThread(userId, id, userRole);
    return { message: 'Thread fetched successfully', data: thread };
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
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateThreadDto,
  ) {
    const thread = await this.threadService.updateThread(userId, id, dto);
    return { message: 'Thread updated successfully', data: thread };
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
  async remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.threadService.deleteThread(userId, id);
    return { message: 'Thread archived successfully', data: {} };
  }
}
