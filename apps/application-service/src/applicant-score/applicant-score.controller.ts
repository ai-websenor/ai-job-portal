/**
 * HTTP surface for applicant scoring.
 *
 * The caller is an **employer**, identified by the JWT the gateway validated,
 * never by a body field. Nothing in the body names a candidate: the shortlist
 * call takes a job id and the detail call takes an application id, and in
 * both cases the candidate is read out of a row the database has already
 * confirmed the employer is entitled to. Taking a user id here instead would
 * let anyone score anyone by guessing a UUID.
 *
 * A refusal is a 403 that says nothing about whether the row exists, and
 * never carries the candidate's name or id, or the job's title.
 */

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { ApplicantScoreService } from './applicant-score.service';
import { ApplicantScoreDto, ApplicantScoresDto } from './dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('applications')
export class ApplicantScoreController {
  constructor(private readonly applicantScoreService: ApplicantScoreService) {}

  @Post('applicant-scores')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Score every applicant to one of your jobs',
    description:
      'Returns a score and band per application id, for the applicant list. Scored on skills, experience, education and resume quality only — the profile is anonymised before any scoring runs.',
  })
  @ApiResponse({ status: 201, description: 'Scores keyed by application id' })
  @ApiResponse({ status: 403, description: 'Job not found or not available to you' })
  async scoreApplicants(@CurrentUser('sub') userId: string, @Body() dto: ApplicantScoresDto) {
    // Wrapped in `data` deliberately. The global ResponseInterceptor, when a
    // handler returns a bare object with no `data` key, strips `message`,
    // `status` and `statusCode` from it as envelope metadata — and our payload
    // has a domain field genuinely called `status`. Returning it bare deleted
    // that field on the way out, so the client saw a 200 with a body it could
    // not recognise.
    return {
      message: 'Applicant match scores generated successfully',
      data: await this.applicantScoreService.scoreApplicants(userId, dto),
    };
  }

  @Post('applicant-score')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Full score breakdown for one application',
    description:
      'The candidate and the job are both read out of the application row, so no candidate id is accepted. Pass force to skip the cached result and re-run the checks.',
  })
  @ApiResponse({ status: 201, description: 'Score, bands, strengths and gaps' })
  @ApiResponse({ status: 403, description: 'Application not found or not available to you' })
  async scoreApplicant(@CurrentUser('sub') userId: string, @Body() dto: ApplicantScoreDto) {
    // See the note above: the payload's own `status` field would otherwise be
    // eaten by the response envelope.
    const data = await this.applicantScoreService.scoreApplicant(userId, dto);
    return {
      message:
        data.status === 'ok'
          ? 'Applicant match insight generated successfully'
          : 'This candidate has not added enough profile detail to score',
      data,
    };
  }
}
