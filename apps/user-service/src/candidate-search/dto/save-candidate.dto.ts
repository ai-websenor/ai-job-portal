import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveCandidateDto {
  @ApiProperty({
    description: 'Profile ID of the candidate to save/shortlist',
    example: 'prof-1234-5678-90ab-cdef12345678',
  })
  @IsUUID()
  profileId: string;

  @ApiPropertyOptional({
    description: 'Optional private note about the candidate',
    example: 'Strong React profile, follow up next week',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
