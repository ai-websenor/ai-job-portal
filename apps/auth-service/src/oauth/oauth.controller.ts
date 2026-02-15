import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { OAuthService } from './oauth.service';
import { Public } from '@ai-job-portal/common';

class GoogleCallbackDto {
  @ApiProperty({ description: 'Authorization code from Cognito redirect' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Must match the redirectUri used in the initial request' })
  @IsString()
  @IsNotEmpty()
  redirectUri: string;

  @ApiPropertyOptional({ enum: ['candidate', 'employer'], default: 'candidate' })
  @IsOptional()
  @IsEnum(['candidate', 'employer'])
  role?: 'candidate' | 'employer';
}

class GoogleNativeDto {
  @ApiProperty({ description: 'Google ID token from native Google Sign-In SDK' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({ enum: ['candidate', 'employer'], default: 'candidate' })
  @IsOptional()
  @IsEnum(['candidate', 'employer'])
  role?: 'candidate' | 'employer';
}

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('google')
  @Public()
  @ApiOperation({ summary: 'Get Google OAuth URL (Cognito Hosted UI)' })
  @ApiQuery({ name: 'redirectUri', required: true, description: 'Frontend callback URL' })
  @ApiQuery({ name: 'role', enum: ['candidate', 'employer'], required: false })
  @ApiResponse({ status: 200, description: 'Returns Cognito hosted UI URL for Google login' })
  getGoogleAuthUrl(
    @Query('redirectUri') redirectUri: string,
    @Query('role') role?: string,
  ) {
    if (!redirectUri) {
      throw new BadRequestException('redirectUri is required');
    }
    return this.oauthService.getGoogleAuthUrl(redirectUri, role || 'candidate');
  }

  @Post('google/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange Cognito authorization code for app tokens' })
  @ApiResponse({ status: 200, description: 'Returns auth tokens and user data' })
  async googleCallback(@Body() dto: GoogleCallbackDto) {
    return this.oauthService.handleCognitoGoogleCallback(
      dto.code,
      dto.redirectUri,
      dto.role || 'candidate',
    );
  }

  @Post('google/native')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google Sign-In for mobile apps (native SDK)' })
  @ApiResponse({ status: 200, description: 'Returns auth tokens and user data' })
  async googleNative(@Body() dto: GoogleNativeDto) {
    return this.oauthService.handleGoogleNativeLogin(
      dto.idToken,
      dto.role || 'candidate',
    );
  }
}
