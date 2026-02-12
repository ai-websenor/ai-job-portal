import { Module } from '@nestjs/common';
import { AwsModule } from '@ai-job-portal/aws';
import { DatabaseModule } from '../database/database.module';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';

@Module({
  imports: [DatabaseModule, AwsModule],
  controllers: [AvatarController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}
