import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    UserModule,
    SessionModule,
  ],
  providers: [],
  controllers: [],
})
export class AuthModule {}
