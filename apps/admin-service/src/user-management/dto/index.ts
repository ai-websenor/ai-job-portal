import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsEmail, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListUsersDto {
  @ApiPropertyOptional({ enum: ['candidate', 'employer', 'admin'] })
  @IsOptional()
  @IsEnum(['candidate', 'employer', 'admin'])
  role?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
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

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] })
  @IsEnum(['active', 'suspended'])
  status: 'active' | 'suspended';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['candidate', 'employer', 'admin'] })
  @IsEnum(['candidate', 'employer', 'admin'])
  role: 'candidate' | 'employer' | 'admin';
}

export class CreateAdminDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}

export class BulkActionDto {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ enum: ['suspend', 'activate', 'delete'] })
  @IsEnum(['suspend', 'activate', 'delete'])
  action: 'suspend' | 'activate' | 'delete';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
