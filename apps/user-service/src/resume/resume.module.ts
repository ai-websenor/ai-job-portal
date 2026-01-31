import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeStructuringService } from './resume-structuring.service';

@Module({
  controllers: [ResumeController],
  providers: [ResumeService, ResumeStructuringService],
  exports: [ResumeService],
})
export class ResumeModule {}
