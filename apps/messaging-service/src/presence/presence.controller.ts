import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PresenceService } from './presence.service';

@ApiTags('presence')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('online-status')
  @ApiOperation({
    summary: 'Batch check online status of users',
    description: `Returns an online/offline map for the given user IDs.
A user is considered "online" if they have an active WebSocket connection with a heartbeat within the last 5 minutes.

**Integration flow:**
1. After loading the thread list, collect all participant user IDs
2. Call this API with comma-separated IDs to get their online status
3. Show "Active Now" badge for users who are online
4. Alternatively, the thread list API already includes \`isOnline\` in participant objects
5. For real-time updates, listen to WebSocket \`user_online\` and \`user_offline\` events`,
  })
  @ApiQuery({
    name: 'userIds',
    description: 'Comma-separated user UUIDs',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890,b2c3d4e5-f6a7-8901-bcde-f23456789012',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Online status map — userId to boolean',
    schema: {
      example: {
        message: 'Online status fetched successfully',
        data: {
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890': true,
          'b2c3d4e5-f6a7-8901-bcde-f23456789012': false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOnlineStatus(@Query('userIds') userIds: string) {
    const ids = userIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const statusMap = await this.presenceService.getOnlineStatus(ids);
    return { message: 'Online status fetched successfully', data: statusMap };
  }
}
