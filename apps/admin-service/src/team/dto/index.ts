import { IsString, IsOptional, IsEnum, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TeamRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  HIRING_MANAGER = 'hiring_manager',
  INTERVIEWER = 'interviewer',
  VIEWER = 'viewer',
}

export class InviteTeamMemberDto {
  @ApiProperty({ description: 'Email of user to invite' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Team role', enum: TeamRole })
  @IsEnum(TeamRole)
  role: TeamRole;

  @ApiPropertyOptional({ description: 'Permissions (comma-separated)' })
  @IsOptional()
  @IsString()
  permissions?: string;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ description: 'Team role', enum: TeamRole })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;

  @ApiPropertyOptional({ description: 'Permissions (comma-separated)' })
  @IsOptional()
  @IsString()
  permissions?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TeamMemberQueryDto {
  @ApiPropertyOptional({ description: 'Filter by role', enum: TeamRole })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class TeamMemberResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyId: string;
  @ApiProperty() userId: string;
  @ApiProperty() role: string;
  @ApiPropertyOptional() permissions?: string;
  @ApiPropertyOptional() invitedBy?: string;
  @ApiProperty() invitedAt: Date;
  @ApiPropertyOptional() acceptedAt?: Date;
  @ApiProperty() isActive: boolean;
}
