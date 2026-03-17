import { Module } from '@nestjs/common';
import { GstValidationService } from './gst-validation.service';

@Module({
  providers: [GstValidationService],
  exports: [GstValidationService],
})
export class GstValidationModule {}
