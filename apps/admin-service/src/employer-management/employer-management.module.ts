import { Module } from '@nestjs/common';
import { EmployerManagementController } from './employer-management.controller';
import { EmployerManagementService } from './employer-management.service';

@Module({
  controllers: [EmployerManagementController],
  providers: [EmployerManagementService],
  exports: [EmployerManagementService],
})
export class EmployerManagementModule {}
