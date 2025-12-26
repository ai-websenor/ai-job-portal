import { IsString, IsOptional, IsEnum, IsDate, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEducationDto {
  @ApiPropertyOptional({
    enum: ['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'],
    example: 'bachelors',
    description: 'Level of education',
  })
  @IsOptional()
  @IsEnum(['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'])
  level?: 'high_school' | 'bachelors' | 'masters' | 'phd' | 'diploma' | 'certificate';

  @ApiProperty({
    example: 'National Institute of Technology',
    description: 'Name of the educational institution',
  })
  @IsString()
  @Length(1, 255)
  institutionName: string;

  @ApiProperty({
    example: 'Bachelor of Technology',
    description: 'Degree obtained',
  })
  @IsString()
  @Length(1, 255)
  degree: string;

  @ApiPropertyOptional({
    example: '2021',
    description: 'Year of completion',
  })
  @IsOptional()
  @IsString()
  yearOfCompletion?: string;

  @ApiPropertyOptional({
    example: 'Computer Science and Engineering',
    description: 'Field of study',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  fieldOfStudy?: string;

  @ApiPropertyOptional({
    example: '2017-08-01T00:00:00.000Z',
    description: 'Education start date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    example: '2021-05-31T00:00:00.000Z',
    description: 'Education end date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    example: '8.4 CGPA',
    description: 'Final grade or CGPA',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  grade?: string;

  @ApiPropertyOptional({
    example: 'Graduated with Distinction',
    description: 'Honors or special achievements',
  })
  @IsOptional()
  @IsString()
  honors?: string;

  @ApiPropertyOptional({
    example: 'Data Structures, Algorithms, Operating Systems, Databases',
    description: 'Key subjects studied',
  })
  @IsOptional()
  @IsString()
  relevantCoursework?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/certificates/degree.pdf',
    description: 'Certificate or degree document URL',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  certificateUrl?: string;
}
