import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userAgent: string;
  @ApiProperty() ipAddress: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() expiresAt: Date;
  @ApiPropertyOptional() isCurrent?: boolean;
}

export class SocialLoginResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() provider: string;
  @ApiProperty() email: string;
  @ApiProperty() createdAt: Date;
}
