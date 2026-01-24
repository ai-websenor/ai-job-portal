import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PreferenceService } from './preference.service';
import { CurrentUser } from '@ai-job-portal/common';

@ApiTags('preferences')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('preferences')
export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences' })
  get(@CurrentUser('sub') userId: string) {
    return this.preferenceService.get(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update notification preferences' })
  update(@CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.preferenceService.update(userId, dto);
  }
}
