import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomLogger } from '@ai-job-portal/logger';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { CandidateSearchService } from './candidate-search.service';
import { SaveCandidateDto } from './dto';

@ApiTags('candidate-search')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('candidates/saved')
export class SavedCandidateController {
  private readonly logger = new CustomLogger();

  constructor(private readonly candidateSearchService: CandidateSearchService) {}

  @Post()
  @ApiOperation({
    summary: 'Save (shortlist) a candidate (employer only)',
    description:
      "Saves a candidate profile to the employer's shortlist. Idempotent — saving an already-saved " +
      'candidate updates the note instead of erroring. The candidate then shows `isSaved: true` in search results.',
  })
  @ApiResponse({ status: 201, description: 'Candidate saved successfully' })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async saveCandidate(@CurrentUser('sub') userId: string, @Body() dto: SaveCandidateDto) {
    this.logger.info('Saving candidate', 'SavedCandidateController', {
      userId,
      profileId: dto.profileId,
    });
    return this.candidateSearchService.saveCandidate(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List saved (shortlisted) candidates (employer only)',
    description: "Returns the employer's saved candidates using the same card shape as search.",
  })
  @ApiResponse({ status: 200, description: 'Saved candidates fetched successfully' })
  async listSaved(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.candidateSearchService.listSavedCandidates(
      userId,
      Number(page) || 1,
      Number(limit) || 10,
    );
    return { message: 'Saved candidates fetched successfully', ...result };
  }

  @Delete(':profileId')
  @ApiOperation({
    summary: 'Remove a candidate from the saved list (employer only)',
  })
  @ApiParam({ name: 'profileId', description: 'Profile ID of the saved candidate' })
  @ApiResponse({ status: 200, description: 'Candidate removed from saved list' })
  @ApiResponse({ status: 404, description: 'Saved candidate not found' })
  async unsaveCandidate(@CurrentUser('sub') userId: string, @Param('profileId') profileId: string) {
    this.logger.warn('Removing saved candidate', 'SavedCandidateController', { userId, profileId });
    return this.candidateSearchService.unsaveCandidate(userId, profileId);
  }
}
