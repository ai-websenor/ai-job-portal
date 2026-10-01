import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * What the employer has typed into the job form so far.
 *
 * Everything is optional except the title, because the form is half-filled
 * when the "estimate" button is pressed. The service decides whether it has
 * enough to work with and says so in `status`.
 */
export class SalaryEstimateDto {
  @ApiProperty({ example: 'Backend Developer', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ type: [String], example: ['Node.js', 'PostgreSQL', 'AWS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 2, description: 'Years of experience, lower bound' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  experienceMin?: number;

  @ApiPropertyOptional({ example: 5, description: 'Years of experience, upper bound' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  experienceMax?: number;

  @ApiPropertyOptional({
    example: 'Udaipur, Rajasthan, India, 313001',
    description:
      'Free-text location exactly as typed on the job form. The city is parsed out of it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['full_time'],
    description: 'Accepted for forward compatibility; does not narrow the comparables yet.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobType?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['onsite'],
    description: 'Accepted for forward compatibility; does not narrow the comparables yet.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workMode?: string[];

  @ApiPropertyOptional({
    example: 'monthly',
    description:
      'hourly | daily | weekly | monthly | yearly. Anything unrecognised is read as monthly. The answer comes back in this rate.',
  })
  @IsOptional()
  @IsString()
  payRate?: string;

  @ApiPropertyOptional({
    type: [Number],
    example: [45000, 60000],
    description:
      'What the employer currently has on the salary slider. Used only for the "your range is X% below the market" comparison.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  currentRange?: number[];
}
