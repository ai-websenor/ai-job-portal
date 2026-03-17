import { Module } from '@nestjs/common';
import { CompanyRegistrationController } from './company-registration.controller';
import { CompanyRegistrationService } from './company-registration.service';
import { GstValidationModule } from '../gst-validation/gst-validation.module';

@Module({
  imports: [GstValidationModule],
  controllers: [CompanyRegistrationController],
  providers: [CompanyRegistrationService],
})
export class CompanyRegistrationModule {}
