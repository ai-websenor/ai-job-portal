import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserPreferencesService } from './user-preferences.service';
import { UpdateThemePreferencesDto } from './dto/update-theme-preferences.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('user-preferences')
@Controller('user/preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user UI preferences (Theme + Notifications)' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getPreferences(@GetUser('id') userId: string) {
    return this.userPreferencesService.getPreferences(userId);
  }

  @Patch('theme')
  @ApiOperation({ summary: 'Update theme preferences' })
  @ApiResponse({ status: 200, description: 'Theme updated successfully' })
  async updateTheme(
    @GetUser('id') userId: string,
    @Body() updateThemeDto: UpdateThemePreferencesDto,
  ) {
    return this.userPreferencesService.updateTheme(userId, updateThemeDto);
  }
}
