import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { SearchService } from './search.service';
import { SearchMessagesDto } from './dto';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search messages by keyword',
    description: `Full-text search across message body and subject fields (case-insensitive).
Only returns messages where the current user is the sender or recipient.

**Integration flow:**
1. User types in the "Search messages" bar at the top of the Messages screen
2. Debounce the input (300-500ms) and call this API with \`?q=keyword\`
3. Results include enriched sender/recipient profiles and thread context
4. Use \`thread.id\` from each result to navigate to the full conversation when user taps a result
5. Optionally filter within a specific thread with \`?threadId=uuid\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with pagination',
    schema: {
      example: {
        message: 'Messages searched successfully',
        data: [
          {
            id: 'f6a7b8c9-d0e1-2345-fa67-890123456789',
            threadId: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
            senderId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
            recipientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            subject: 'Interview scheduling',
            body: 'We want to invite you for a quick interview tomorrow at 3pm.',
            attachments: null,
            status: 'read',
            isRead: true,
            readAt: '2026-02-27T10:35:00.000Z',
            deliveredAt: '2026-02-27T10:30:05.000Z',
            createdAt: '2026-02-27T10:30:00.000Z',
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
            thread: {
              id: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
              jobId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
              applicationId: null,
            },
          },
        ],
        pagination: {
          totalMessage: 5,
          pageCount: 1,
          currentPage: 1,
          hasNextPage: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@CurrentUser('sub') userId: string, @Query() dto: SearchMessagesDto) {
    const result = await this.searchService.searchMessages(userId, dto);
    return { message: 'Messages searched successfully', ...result };
  }
}
