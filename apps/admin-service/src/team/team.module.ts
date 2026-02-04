import { Module } from '@nestjs/common';
import { TeamController, MyTeamsController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  controllers: [TeamController, MyTeamsController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
