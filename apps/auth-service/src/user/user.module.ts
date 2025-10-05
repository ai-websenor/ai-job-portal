import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { DatabaseService } from '../database/database.service';

@Module({
  providers: [UserService, DatabaseService],
  exports: [UserService],
})
export class UserModule {}
