import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpCleanupService } from './otp-cleanup.service';

@Module({
  providers: [OtpService, OtpCleanupService],
  exports: [OtpService],
})
export class OtpModule {}
