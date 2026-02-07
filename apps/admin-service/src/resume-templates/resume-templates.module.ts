import { Module } from '@nestjs/common';
import { ResumeTemplatesController } from './resume-templates.controller';
import { ResumeTemplatesService } from './resume-templates.service';
import { DatabaseModule } from '../database/database.module';
import { AwsModule } from '@ai-job-portal/aws';

@Module({
  imports: [DatabaseModule, AwsModule],
  controllers: [ResumeTemplatesController],
  providers: [ResumeTemplatesService],
  exports: [ResumeTemplatesService],
})
export class ResumeTemplatesModule {}
