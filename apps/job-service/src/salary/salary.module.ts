import { Module } from '@nestjs/common';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { SalarySettingsService } from './salary.settings';

@Module({
  controllers: [SalaryController],
  providers: [SalaryService, SalarySettingsService],
  exports: [SalaryService],
})
export class SalaryModule {}
