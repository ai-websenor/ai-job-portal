import { Controller, Get, Put, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { PreferenceService } from './preference.service';
import { CurrentUser } from '@ai-job-portal/common';

class ToggleWhatsAppDto {
  @ApiProperty({
    description: 'Enable or disable WhatsApp notifications across all categories',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
}

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
  @ApiOperation({ summary: 'Update notification preferences (granular per category)' })
  update(@CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.preferenceService.update(userId, dto);
  }

  @Patch('whatsapp')
  @ApiOperation({
    summary: 'Enable or disable WhatsApp notifications',
    description:
      'Toggles WhatsApp notifications on or off across all categories (jobAlerts, applicationUpdates, interviewReminders, messages, marketing) at once.',
  })
  @ApiResponse({ status: 200, description: 'WhatsApp preference updated' })
  toggleWhatsApp(@CurrentUser('sub') userId: string, @Body() dto: ToggleWhatsAppDto) {
    return this.preferenceService.toggleWhatsApp(userId, dto.enabled);
  }
}
