import { Module } from '@nestjs/common';
import { SessionService } from './services/session.service';
import { DatabaseService } from '../database/database.service';

@Module({
  providers: [SessionService, DatabaseService],
  exports: [SessionService],
})
export class SessionModule {}
