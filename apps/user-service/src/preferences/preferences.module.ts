import { Module } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';
import { ProfileModule } from '../profile/profile.module';
import { GrpcModule } from '../grpc/grpc.module';

@Module({
  imports: [ProfileModule, GrpcModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
