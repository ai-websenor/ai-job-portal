import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  controllers: [OAuthController],
  providers: [OAuthService, GoogleStrategy],
  exports: [OAuthService],
})
export class OAuthModule {}
