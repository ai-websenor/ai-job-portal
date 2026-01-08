import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { JobType, ExperienceLevel } from '../enums/job.enums';

export class JobQueryDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Number of jobs to return per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    enum: JobType,
    description: 'Filter by job type',
    enumName: 'JobType',
  })
  @IsOptional()
  @IsEnum(JobType, {
    message: `jobType must be one of: ${Object.values(JobType).join(', ')}`,
  })
  jobType?: JobType;

  @ApiPropertyOptional({
    enum: ExperienceLevel,
    description: 'Filter by experience level',
    enumName: 'ExperienceLevel',
  })
  @IsOptional()
  @IsEnum(ExperienceLevel, {
    message: `experienceLevel must be one of: ${Object.values(ExperienceLevel).join(', ')}`,
  })
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({
    example: 'Bangalore',
    description: 'Filter by city',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Karnataka',
    description: 'Filter by state',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'Node.js',
    description: 'Search keyword for job title or description',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
