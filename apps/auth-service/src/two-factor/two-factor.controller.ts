import { Controller, Post, Get, Body, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@ai-job-portal/common';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class VerifyTokenDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  token: string;
}

class SetupResponseDto {
  @ApiProperty()
  secret: string;

  @ApiProperty()
  qrCodeUrl: string;
}

class EnableResponseDto {
  @ApiProperty({ type: [String] })
  backupCodes: string[];
}

class StatusResponseDto {
  @ApiProperty()
  enabled: boolean;
}

@ApiTags('2fa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 200, type: SetupResponseDto })
  async setup(@CurrentUser('sub') userId: string): Promise<SetupResponseDto> {
    return this.twoFactorService.generateSecret(userId);
  }

  @Post('enable')
  @ApiOperation({ summary: 'Verify token and enable 2FA' })
  @ApiResponse({ status: 200, type: EnableResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async enable(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyTokenDto,
  ): Promise<EnableResponseDto> {
    return this.twoFactorService.verifyAndEnable(userId, dto.token);
  }

  @Delete('disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async disable(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyTokenDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.disable(userId, dto.token);
    return { message: '2FA disabled successfully' };
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if 2FA is enabled' })
  @ApiResponse({ status: 200, type: StatusResponseDto })
  async status(@CurrentUser('sub') userId: string): Promise<StatusResponseDto> {
    const enabled = await this.twoFactorService.isEnabled(userId);
    return { enabled };
  }
}
