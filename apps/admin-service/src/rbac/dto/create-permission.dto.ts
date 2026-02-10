import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'companies:write',
    description: 'Permission name (resource:action format)',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Can create and edit companies' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'companies', description: 'Resource this permission applies to' })
  @IsString()
  resource: string;

  @ApiProperty({ example: 'write', description: 'Action (read, write, delete, etc.)' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
