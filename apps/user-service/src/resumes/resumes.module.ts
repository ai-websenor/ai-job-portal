import { Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { UploadController } from './upload.controller';
import { ProfileModule } from '../profile/profile.module';
import { StorageModule } from '../storage/storage.module';
import { GrpcModule } from '../grpc/grpc.module';
import { ResumeTextService } from './resume-text.service';
import { ResumeAiService } from './resume-ai.service';

@Module({
  imports: [ProfileModule, StorageModule, GrpcModule],
  controllers: [ResumesController, UploadController],
  providers: [ResumesService, ResumeTextService, ResumeAiService],
  exports: [ResumesService, ResumeTextService, ResumeAiService],
})
export class ResumesModule {}
