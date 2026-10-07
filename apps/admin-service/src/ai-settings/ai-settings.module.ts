import { Module } from '@nestjs/common';
import { AiSettingsController } from './ai-settings.controller';
import { AiSettingsService } from './ai-settings.service';

/**
 * Admin control over the platform's AI features.
 *
 * Today that is one switch: whether salary prediction may fall back to an
 * external source when the platform has no comparable jobs of its own.
 */
@Module({
  controllers: [AiSettingsController],
  providers: [AiSettingsService],
  exports: [AiSettingsService],
})
export class AiSettingsModule {}
