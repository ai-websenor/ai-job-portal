import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsDateString,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobQuestionDto } from './job-question.dto';

export class CreateJobDto {
    // ================= BASIC DETAILS =================

    @ApiProperty({ example: 'Senior Backend Developer' })
    @IsString()
    title: string;

    @ApiProperty({
        example: 'We are looking for a Node.js developer with microservices experience',
    })
    @IsString()
    description: string;

    // ================= SKILLS =================

    @ApiProperty({
        example: ['Node.js', 'NestJS', 'PostgreSQL'],
        type: [String],
    })
    @IsArray()
    skills: string[];

    // ================= SALARY =================

    @ApiProperty({ example: 5000 })
    @IsNumber()
    salaryMin: number;

    @ApiProperty({ example: 22000 })
    @IsNumber()
    salaryMax: number;

    @ApiPropertyOptional({ example: 'Monthly' })
    @IsOptional()
    @IsString()
    payRate?: string;

    // ================= LOCATION =================

    @ApiPropertyOptional({ example: 'Karnataka' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional({ example: 'Bangalore' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({
        example: 'Hybrid',
        description: 'Remote | Onsite | Hybrid',
    })
    @IsOptional()
    @IsString()
    location?: string;

    // ================= JOB META =================

    //   ✅ REQUIRED (DB NOT NULL)
    @ApiProperty({
        example: 'mid',
        description: 'Experience level required for the job (e.g., entry, mid, senior, lead)',
    })
    @IsString()
    experienceLevel: string;

    @ApiProperty({
        example: 'full_time',
        description: 'full_time | part_time | contract |remote',
    })
    @IsString()
    jobType: string;

    @ApiProperty({
        example: 'permanent',
        description: 'permanent | contract',
    })
    @IsString()
    workType: string;

    // ================= APPLICATION DEADLINE =================

    @ApiPropertyOptional({ example: '2026-02-01' })
    @IsOptional()
    @IsDateString()
    applicationDeadline?: string;

    // ================= CUSTOM QUESTIONS =================

    @ApiPropertyOptional({
        type: [JobQuestionDto],
        // example: [
        //     {
        //         question: 'What is your preferred working style?',
        //         type: 'multiple_choice',
        //         options: ['Remote', 'Hybrid', 'Onsite'],
        //         isMandatory: true,
        //     },
        //     {
        //         question: 'What is your expected salary?',
        //         type: 'text',
        //         isMandatory: true,
        //     },
        // ],
        // description: 'Custom questions for job application',
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => JobQuestionDto)
    questions?: JobQuestionDto[];
}
