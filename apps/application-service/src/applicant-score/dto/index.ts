/**
 * Request bodies for applicant scoring.
 *
 * Nothing here names a candidate, and that is the point. The shortlist call
 * takes a job id and the detail call takes an application id, so in both
 * cases the candidate is read out of a row the database has already confirmed
 * the caller is entitled to. Accepting a user id would let anyone score
 * anyone by guessing a UUID.
 *
 * The service runs `ValidationPipe({ whitelist: true })`, so a `candidateId`
 * smuggled into the body is stripped before the controller sees it.
 */

import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Every applicant to one job, for the shortlist table. */
export class ApplicantScoresDto {
  @ApiProperty({ description: 'Job to score the applicants of. Must be a job you can view.' })
  @IsUUID()
  jobId: string;

  @ApiPropertyOptional({
    description: 'How many applicants to score, newest first.',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

/** One applicant, for the candidate detail page. */
export class ApplicantScoreDto {
  @ApiProperty({
    description:
      'Application to score. The candidate and the job are both read out of this row, so no candidate id is ever accepted.',
  })
  @IsUUID()
  applicationId: string;

  @ApiPropertyOptional({
    description: 'Skip the cached result and re-run the checks, for the "Re-score" button.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}
