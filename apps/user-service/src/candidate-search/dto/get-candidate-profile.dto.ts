import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetCandidateProfileDto {
  @ApiPropertyOptional({
    description:
      'Pins the application context. When provided, the response `application` object is this exact application ' +
      '(authorized against the employer/company). When omitted, the latest application to the employer company is used, if any.',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;
}
