import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomLogger } from '@ai-job-portal/logger';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { CandidateProfileService } from './candidate-profile.service';
import { GetCandidateProfileDto } from './dto';

@ApiTags('candidate-search')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('candidates')
export class CandidateProfileController {
  private readonly logger = new CustomLogger();

  constructor(private readonly candidateProfileService: CandidateProfileService) {}

  @Get(':profileId/profile')
  @ApiOperation({
    summary: 'Get a candidate profile by profileId (employer only)',
    description: `Unified candidate profile for employers — same response shape as \`GET /applications/:id/candidate-profile\`, usable from both candidate search (no application) and application contexts.

- \`applicationId\` (optional query): pins the application context; authorized like the application-based endpoint. When omitted, \`application\` is the candidate's latest application to your company, or \`null\`.
- Private profiles are only accessible if the candidate applied to your company (404 otherwise).
- Viewing is free. \`resume\` contains metadata only — the signed download URL (and the resume_access charge) comes from \`GET /candidates/:profileId/resume\`.
- \`threadId\` (top-level): **your own** existing chat thread with this candidate — your application thread when you are a participant of it, otherwise your direct (sourcing) thread. A colleague's application thread is never returned here. \`null\` means you have no conversation yet; start one via \`POST /messages/threads\` (omit \`applicationId\` for search-based outreach).`,
  })
  @ApiParam({ name: 'profileId', description: 'Candidate profile id (profiles.id)' })
  @ApiResponse({ status: 200, description: 'Candidate profile retrieved' })
  @ApiResponse({ status: 400, description: 'Application does not belong to this candidate' })
  @ApiResponse({ status: 403, description: 'Access denied or employer profile required' })
  @ApiResponse({ status: 404, description: 'Candidate profile or application not found' })
  async getCandidateProfile(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Query() dto: GetCandidateProfileDto,
  ) {
    this.logger.info('Fetching candidate profile', 'CandidateProfileController', {
      userId,
      profileId,
      applicationId: dto.applicationId,
    });
    return this.candidateProfileService.getCandidateProfile(
      userId,
      userRole,
      profileId,
      dto.applicationId,
    );
  }

  @Get(':profileId/resume')
  @ApiOperation({
    summary: "Get a signed download URL for a candidate's resume (employer only)",
    description: `Returns the candidate's default resume with a 1-hour signed download URL.

First download of a candidate consumes one \`resume_access\` subscription credit (per employer user + candidate); subsequent downloads — including candidates already viewed via the application-based profile endpoint — are free.`,
  })
  @ApiParam({ name: 'profileId', description: 'Candidate profile id (profiles.id)' })
  @ApiResponse({ status: 200, description: 'Resume download URL generated' })
  @ApiResponse({
    status: 403,
    description:
      'Employer profile required, no active subscription, or resume access limit reached',
  })
  @ApiResponse({ status: 404, description: 'Candidate profile or resume not found' })
  async downloadResume(
    @CurrentUser('sub') userId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    this.logger.info('Generating candidate resume download URL', 'CandidateProfileController', {
      userId,
      profileId,
    });
    return this.candidateProfileService.downloadResume(userId, profileId);
  }
}
