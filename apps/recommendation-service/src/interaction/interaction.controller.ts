import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { InteractionService } from './interaction.service';
import { TrackInteractionDto, BulkTrackInteractionsDto } from './dto';

@ApiTags('interactions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('interactions')
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) {}

  @Post()
  @ApiOperation({ summary: 'Track a single interaction' })
  @ApiResponse({ status: 201, description: 'Interaction tracked' })
  async trackInteraction(
    @CurrentUser('sub') userId: string,
    @Body() dto: TrackInteractionDto,
  ) {
    return this.interactionService.trackInteraction(userId, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Track multiple interactions at once' })
  @ApiResponse({ status: 201, description: 'Interactions tracked' })
  async bulkTrackInteractions(
    @CurrentUser('sub') userId: string,
    @Body() dto: BulkTrackInteractionsDto,
  ) {
    return this.interactionService.bulkTrackInteractions(userId, dto.interactions);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user interaction history' })
  async getInteractionHistory(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.interactionService.getUserInteractionHistory(userId, limit || 50);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user interaction statistics' })
  async getStats(@CurrentUser('sub') userId: string) {
    return this.interactionService.getInteractionStats(userId);
  }
}
