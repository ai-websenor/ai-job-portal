import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { StorageModule } from '../storage/storage.module';
import { GrpcModule } from '../grpc/grpc.module';

@Module({
  imports: [StorageModule, GrpcModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
