import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from '../user/user.module';
import { SessionModule } from '../session/session.module';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { OtpModule } from '../otp/otp.module';
import { TwoFactorModule } from '../two-factor/two-factor.module';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ProfileClientService } from '../clients/profile-client.service';

@Module({
  imports: [
    UserModule,
    SessionModule,
    EmailModule,
    SmsModule,
    OtpModule,
    TwoFactorModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('app.jwt.accessTokenExpiration'),
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    DatabaseService,
    ProfileClientService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    {
      provide: GoogleStrategy,
      useFactory: (configService: ConfigService) => {
        const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
        if (!clientId) {
          return null;
        }
        return new GoogleStrategy(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: LinkedInStrategy,
      useFactory: (configService: ConfigService) => {
        const clientId = configService.get<string>('LINKEDIN_CLIENT_ID');
        if (!clientId) {
          return null;
        }
        return new LinkedInStrategy(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
