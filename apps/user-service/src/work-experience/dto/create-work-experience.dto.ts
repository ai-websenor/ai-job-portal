import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDate,
  Length,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateWorkExperienceDto {
  @ApiProperty({
    example: 'CloudNova Technologies',
    description: 'Name of the company',
  })
  @IsString()
  @Length(1, 255)
  companyName: string;

  @ApiProperty({
    example: 'Software Engineer',
    description: 'Job title of the employee',
  })
  @IsString()
  @Length(1, 255)
  jobTitle: string;

  @ApiProperty({
    example: 'Backend Developer',
    description: 'Specific designation or role',
  })
  @IsString()
  @Length(1, 255)
  designation: string;

  @ApiPropertyOptional({
    enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
    example: 'full_time',
    description: 'Type of employment',
  })
  @IsOptional()
  @IsEnum(['full_time', 'part_time', 'contract', 'internship', 'freelance'])
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';

  @ApiPropertyOptional({
    example: 'Bengaluru, India',
    description: 'Job location',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  location?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indicates if this is the current job',
  })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({
    example: '2 years',
    description: 'Duration of employment (Ignored - Computed dynamically from dates)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  duration?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'True if the user is a fresher with no work experience',
  })
  @IsOptional()
  @IsBoolean()
  isFresher?: boolean;

  @ApiPropertyOptional({
    example: '2021-07-01T00:00:00.000Z',
    description: 'Job start date',
  })
  @ApiProperty({
    example: '2021-07-01T00:00:00.000Z',
    description: 'Job start date',
  })
  @IsNotEmpty({ message: 'Start date is required' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiPropertyOptional({
    example: '2023-06-30T00:00:00.000Z',
    description: 'Job end date (null if current job)',
  })
  @ApiPropertyOptional({
    example: '2023-06-30T00:00:00.000Z',
    description: 'Job end date (null if current job)',
  })
  @ValidateIf((o) => !o.isCurrent)
  @IsNotEmpty({ message: 'End date is required for past jobs' })
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    example: 'Worked on backend APIs using NestJS and PostgreSQL.',
    description: 'Job description and responsibilities',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Improved API performance by 30%',
    description: 'Key achievements in this role',
  })
  @IsOptional()
  @IsString()
  achievements?: string;

  @ApiPropertyOptional({
    example: 'TypeScript, NestJS, PostgreSQL',
    description: 'Technologies and skills used',
  })
  @IsOptional()
  @IsString()
  skillsUsed?: string;
}
