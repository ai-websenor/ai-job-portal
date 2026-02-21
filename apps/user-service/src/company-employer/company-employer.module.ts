import { Module } from '@nestjs/common';
import { CompanyEmployerController } from './company-employer.controller';
import { CompanyEmployerService } from './company-employer.service';

@Module({
  controllers: [CompanyEmployerController],
  providers: [CompanyEmployerService],
  exports: [CompanyEmployerService],
})
export class CompanyEmployerModule {}
