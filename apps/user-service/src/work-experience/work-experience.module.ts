import { Module } from '@nestjs/common';
import { WorkExperienceService } from './work-experience.service';
import { WorkExperienceController } from './work-experience.controller';
import { ProfileModule } from '../profile/profile.module';
import { GrpcModule } from '../grpc/grpc.module';

@Module({
  imports: [ProfileModule, GrpcModule],
  controllers: [WorkExperienceController],
  providers: [WorkExperienceService],
  exports: [WorkExperienceService],
})
export class WorkExperienceModule {}
