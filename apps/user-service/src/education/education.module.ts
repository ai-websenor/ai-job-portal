import { Module } from '@nestjs/common';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { ProfileModule } from '../profile/profile.module';
import { GrpcModule } from '../grpc/grpc.module';

@Module({
  imports: [ProfileModule, GrpcModule],
  controllers: [EducationController],
  providers: [EducationService],
  exports: [EducationService],
})
export class EducationModule {}
