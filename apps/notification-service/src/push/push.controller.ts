import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { JwtAuthGuard, CurrentUser } from '@ai-job-portal/common';
import { PushService } from './push.service';

class RegisterTokenDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ enum: ['web', 'android', 'ios'] })
  @IsEnum(['web', 'android', 'ios'])
  platform: 'web' | 'android' | 'ios';
}

class RemoveTokenDto {
  @ApiProperty({ description: 'FCM device token to deactivate' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

@ApiTags('push-notifications')
@Controller('notifications/device-token')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register FCM device token' })
  @ApiResponse({ status: 201, description: 'Token registered' })
  async registerToken(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterTokenDto,
  ) {
    return this.pushService.registerToken(userId, dto.token, dto.platform);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate FCM device token (on logout)' })
  @ApiResponse({ status: 200, description: 'Token deactivated' })
  async removeToken(@Body() dto: RemoveTokenDto) {
    return this.pushService.removeToken(dto.token);
  }
}
