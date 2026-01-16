import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsArray, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListJobsForModerationDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'flagged'] })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'flagged'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class ModerateJobDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  violations?: string[];
}

export class FlagJobDto {
  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ enum: ['spam', 'inappropriate', 'fake', 'discriminatory', 'other'] })
  @IsOptional()
  @IsEnum(['spam', 'inappropriate', 'fake', 'discriminatory', 'other'])
  category?: string;
}

export class BulkModerateDto {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  jobIds: string[];

  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
