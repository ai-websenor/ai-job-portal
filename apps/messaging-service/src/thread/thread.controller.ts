import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
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
- 403 if no matching job application exists between the users or the application is view-only (\`rejected\`, \`withdrawn\`, \`offer_rejected\`)
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
              phone: '+919876543210',
              profilePhoto: 'https://s3.amazonaws.com/photos/jan.jpg',
              companyName: 'Acme Corp',
              companyLogo: 'https://s3.amazonaws.com/logos/acme.png',
              isOnline: true,
              role: 'employer',
            },
            {
              id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
              firstName: 'Ahmed',
              lastName: 'Anjims',
              phone: '+919812345678',
              profilePhoto: 'https://s3.amazonaws.com/photos/ahmed.jpg',
              companyName: null,
              companyLogo: null,
              isOnline: false,
              role: 'candidate',
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
    description:
      'Forbidden — no job application exists, application is view-only (rejected, withdrawn, offer_rejected), or candidate application not yet shortlisted',
  })
  async create(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateThreadDto,
  ) {
    const result = await this.threadService.createThread(userId, dto, userRole);
    return { message: 'Thread created successfully', data: result };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all message threads for current user',
    description: `Returns a paginated list of conversation threads for the logged-in user.
**One thread per job application** — a candidate who applies to multiple jobs at the same company has a separate, isolated thread per application.
Each thread includes enriched participant profiles (name, phone, photo, online status, **role**), the \`jobId\` / \`jobTitle\` / \`jobStatus\` this thread belongs to, the last message preview, last message timestamp, and unread count.

**Job fields:**
- \`jobId\` — full UUID of the job this thread belongs to. The same \`jobTitle\` can repeat across jobs, so always pair it with \`jobId\`. Frontend may show the last 12 chars of \`jobId\` as a short code (e.g. \`BC2927BDE54D\`).
- \`jobTitle\` — title of the job.
- \`jobStatus\` — job posting status (e.g. \`active\`, \`closed\`, \`expired\`).

**Participant role field:**
Each participant has a \`role\` field: \`"candidate"\` or \`"employer"\`.
Use this to identify the chat partner — especially important for employers with company-chat permission who may not be a direct participant.

**Employer job filter (Phase 2):**
Pass \`?jobId={jobId}\` to filter the inbox to a single job. Use \`GET /messages/threads/job-filters\` to populate the dropdown of jobs present in the inbox.
Pass \`?ownJobsOnly=true\` to show only threads for jobs the current recruiter owns (posted). Useful when a recruiter has company-wide chat permission but wants to focus on their own jobs.

**Employer ownership flag:**
Each thread includes \`isOwnJob\` — \`true\` when the viewing recruiter posted the job this thread belongs to, \`false\` for a colleague's job (visible via company-chat permission) or for candidate-side responses.

**Integration flow:**
1. Call this API when rendering the Messages inbox/list screen
2. To display the chat name: find the participant whose \`role\` is the opposite of the current user (employer sees candidate name, candidate sees company/employer name)
3. Show \`jobTitle\` (+ short code from \`jobId\`) on each card so the user knows which job the chat belongs to
4. Use \`lastMessage.body\` for message preview and \`lastMessageAt\` for relative timestamps
5. Use \`unreadCount > 0\` to show the blue unread dot indicator
6. Paginate with \`?page=1&limit=20\`

> Note: chat write-availability is enforced by the server — sending in a thread whose application is \`rejected\`, \`withdrawn\`, or \`offer_rejected\` returns \`403\`.`,
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
                phone: '+919876543210',
                profilePhoto: 'https://s3.amazonaws.com/photos/jan.jpg',
                companyName: 'Acme Corp',
                companyLogo: 'https://s3.amazonaws.com/logos/acme.png',
                isOnline: true,
                role: 'employer',
              },
              {
                id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
                firstName: 'Ahmed',
                lastName: 'Anjims',
                phone: '+919812345678',
                profilePhoto: null,
                companyName: null,
                companyLogo: null,
                isOnline: false,
                role: 'candidate',
              },
            ],
            applicationId: 'd4e5f6a7-b8c9-0123-defa-456789012345',
            jobId: '97dc7806-6c19-4b87-a914-bc2927bde54d',
            jobTitle: 'MERN Stack Developer',
            jobStatus: 'active',
            isOwnJob: true,
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
        pagination: {
          totalThread: 12,
          pageCount: 1,
          currentPage: 1,
          hasNextPage: false,
        },
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

  @Get('job-filters')
  @ApiOperation({
    summary: 'Get distinct jobs in the employer inbox (job-name filter dropdown)',
    description: `Returns the distinct jobs that have conversation threads in the current employer's company inbox.
Use this to populate the **job-name filter** dropdown on the employer Messages screen.

Each item has \`jobId\`, \`jobTitle\`, and \`jobStatus\`. Because an employer can post multiple jobs with the
same title (e.g. "MERN Stack Developer" for Bangalore, Hyderabad, Kochi), render each option as
\`jobTitle + #SHORTCODE\` where SHORTCODE is the last 12 chars of \`jobId\` (uppercase, dashes removed).
Filter the thread list by passing \`GET /messages/threads?jobId={jobId}\`.

Pass \`?search=\` for a server-side searchable dropdown. The term matches **either** the job title
(case-insensitive substring) **or** the 12-char short code shown as "JOB ID" (last 12 chars of the
\`jobId\`, dashes removed) — so users can type a few code chars or part of the title. Results capped at 50.

Candidate-side callers receive an empty list (candidates do not filter by job).`,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter dropdown by job title or 12-char short code (case-insensitive substring).',
    example: 'bc2927bde54d',
  })
  @ApiResponse({
    status: 200,
    description: 'Distinct jobs present in the employer inbox',
    schema: {
      example: {
        message: 'Job filters fetched successfully',
        data: [
          {
            jobId: '97dc7806-6c19-4b87-a914-bc2927bde54d',
            jobTitle: 'MERN Stack Developer',
            jobStatus: 'active',
          },
          {
            jobId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            jobTitle: 'MERN Stack Developer',
            jobStatus: 'closed',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getJobFilters(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('search') search?: string,
  ) {
    const result = await this.threadService.getJobFilters(userId, userRole, search);
    return { message: 'Job filters fetched successfully', ...result };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific thread by ID',
    description: `Returns a single thread with enriched participant profiles (including \`phone\` and \`role\` fields).
Use this when navigating into a specific conversation.

**Integration flow:**
1. Call when user taps on a thread from the list
2. Use the participant with the opposite \`role\` to render the chat header (name, phone, photo, "Active Now")
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
            phone: '+919876543210',
            profilePhoto: 'https://s3.amazonaws.com/photos/jan.jpg',
            companyName: 'Acme Corp',
            companyLogo: 'https://s3.amazonaws.com/logos/acme.png',
            isOnline: true,
            role: 'employer',
          },
          {
            id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
            firstName: 'Ahmed',
            lastName: 'Anjims',
            phone: '+919812345678',
            profilePhoto: null,
            companyName: null,
            companyLogo: null,
            isOnline: true,
            role: 'candidate',
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
