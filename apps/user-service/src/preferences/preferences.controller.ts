import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpdateJobPreferencesDto } from './dto/update-job-preferences.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('candidate-preferences')
@Controller('candidate/preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get job preferences' })
  @ApiResponse({ status: 200, description: 'Job preferences retrieved' })
  async getPreferences(@GetUser('id') userId: string) {
    const { profile } = await this.profileService.findByUserId(userId);
    return this.preferencesService.findByProfile(profile.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update job preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @GetUser('id') userId: string,
    @Body() updateDto: UpdateJobPreferencesDto,
  ) {
    const { profile } = await this.profileService.findByUserId(userId);
    return this.preferencesService.update(profile.id, updateDto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete job preferences' })
  @ApiResponse({ status: 200, description: 'Preferences deleted successfully' })
  async deletePreferences(@GetUser('id') userId: string) {
    const { profile } = await this.profileService.findByUserId(userId);
    return this.preferencesService.delete(profile.id);
  }
}
