import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { LanguageService } from './language.service';
import { AddProfileLanguageDto, UpdateProfileLanguageDto, LanguageQueryDto } from './dto';

@ApiTags('languages')
@Controller()
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  // Master languages list (public)
  @Get('languages')
  @Public()
  @ApiOperation({ summary: 'Get all available languages' })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Languages list retrieved' })
  getAllLanguages(@Query() query: LanguageQueryDto) {
    return this.languageService.getAllLanguages(query);
  }

  // Profile languages
  @Post('candidates/languages')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add language to profile' })
  @ApiResponse({ status: 201, description: 'Language added to profile' })
  addLanguage(@CurrentUser('sub') userId: string, @Body() dto: AddProfileLanguageDto) {
    return this.languageService.addLanguage(userId, dto);
  }

  @Get('candidates/languages')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get profile languages' })
  @ApiResponse({ status: 200, description: 'Profile languages retrieved' })
  getProfileLanguages(@CurrentUser('sub') userId: string) {
    return this.languageService.getProfileLanguages(userId);
  }

  @Put('candidates/languages/:languageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update profile language' })
  @ApiParam({ name: 'languageId', description: 'Language ID' })
  @ApiResponse({ status: 200, description: 'Language updated' })
  updateProfileLanguage(
    @CurrentUser('sub') userId: string,
    @Param('languageId') languageId: string,
    @Body() dto: UpdateProfileLanguageDto,
  ) {
    return this.languageService.updateProfileLanguage(userId, languageId, dto);
  }

  @Delete('candidates/languages/:languageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove language from profile' })
  @ApiParam({ name: 'languageId', description: 'Language ID' })
  @ApiResponse({ status: 200, description: 'Language removed' })
  removeLanguage(@CurrentUser('sub') userId: string, @Param('languageId') languageId: string) {
    return this.languageService.removeLanguage(userId, languageId);
  }
}
