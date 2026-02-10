import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'CONTENT_MODERATOR' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Can moderate and review content' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['permission-uuid-1', 'permission-uuid-2'],
    description: 'Array of permission IDs to assign to this role (replaces existing)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
