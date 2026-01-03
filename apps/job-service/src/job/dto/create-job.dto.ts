import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
    @ApiProperty()
    title: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    employerId: string;

    @ApiProperty()
    location: string;

    @ApiProperty()
    salaryMin: number;

    @ApiProperty()
    salaryMax: number;

    @ApiProperty()
    skills: string[];

    @ApiProperty()
    jobType: string;

    @ApiProperty()
    experienceLevel: string;
}
