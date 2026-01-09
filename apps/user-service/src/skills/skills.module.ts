import {Module} from '@nestjs/common';
import {SkillsService} from './skills.service';
import {SkillsController} from './skills.controller';
import {ProfileModule} from '../profile/profile.module';
import {GrpcModule} from '../grpc/grpc.module';

@Module({
  imports: [ProfileModule, GrpcModule],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
