import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum EducationLevel {
  HIGH_SCHOOL = 'high_school',
  BACHELORS = 'bachelors',
  MASTERS = 'masters',
  PHD = 'phd',
  DIPLOMA = 'diploma',
  CERTIFICATE = 'certificate',
}

export enum MasterDataType {
  MASTER_TYPED = 'master-typed',
  USER_TYPED = 'user-typed',
}

export class CreateDegreeDto {
  @ApiProperty({ description: 'Degree name (e.g. Bachelor of Technology)' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Education level', enum: EducationLevel })
  @IsEnum(EducationLevel)
  level: EducationLevel;
}

export class UpdateDegreeDto {
  @ApiPropertyOptional({ description: 'Degree name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Education level', enum: EducationLevel })
  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @ApiPropertyOptional({ description: 'Master data type', enum: MasterDataType })
  @IsOptional()
  @IsEnum(MasterDataType)
  type?: MasterDataType;
}

export class CreateFieldOfStudyDto {
  @ApiProperty({ description: 'Field of study name (e.g. Computer Science)' })
  @IsString()
  name: string;
}

export class UpdateFieldOfStudyDto {
  @ApiPropertyOptional({ description: 'Field of study name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Master data type', enum: MasterDataType })
  @IsOptional()
  @IsEnum(MasterDataType)
  type?: MasterDataType;
}

export class DegreeQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by level', enum: EducationLevel })
  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @ApiPropertyOptional({ description: 'Filter by type', enum: MasterDataType })
  @IsOptional()
  @IsEnum(MasterDataType)
  type?: MasterDataType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class FieldOfStudyQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by type', enum: MasterDataType })
  @IsOptional()
  @IsEnum(MasterDataType)
  type?: MasterDataType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
