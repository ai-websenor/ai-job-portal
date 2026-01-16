import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, BulkUpdateSettingsDto, FeatureFlagDto } from './dto';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // System Settings
  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get setting by key' })
  async getSetting(@Param('key') key: string) {
    const value = await this.settingsService.getSetting(key);
    return { key, value };
  }

  @Put()
  @ApiOperation({ summary: 'Update a setting' })
  async updateSetting(@Body() dto: UpdateSettingDto) {
    return this.settingsService.updateSetting(dto);
  }

  @Put('bulk')
  @ApiOperation({ summary: 'Bulk update settings' })
  async bulkUpdateSettings(@Body() dto: BulkUpdateSettingsDto) {
    return this.settingsService.bulkUpdateSettings(dto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a setting' })
  async deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }

  // Feature Flags
  @Get('features/all')
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAllFeatureFlags() {
    return this.settingsService.getAllFeatureFlags();
  }

  @Get('features/:name')
  @ApiOperation({ summary: 'Get feature flag status' })
  async getFeatureFlag(@Param('name') name: string) {
    const enabled = await this.settingsService.getFeatureFlag(name);
    return { name, enabled };
  }

  @Put('features')
  @ApiOperation({ summary: 'Set feature flag' })
  async setFeatureFlag(@Body() dto: FeatureFlagDto) {
    return this.settingsService.setFeatureFlag(dto);
  }

  @Delete('features/:name')
  @ApiOperation({ summary: 'Delete feature flag' })
  async deleteFeatureFlag(@Param('name') name: string) {
    return this.settingsService.deleteFeatureFlag(name);
  }

  // Cache
  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear settings cache' })
  async clearCache() {
    return this.settingsService.clearCache();
  }
}
