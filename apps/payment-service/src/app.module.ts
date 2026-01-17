import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@ai-job-portal/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PaymentModule } from './payment/payment.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { InvoiceModule } from './invoice/invoice.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.dev', '.env', '../../.env', '../../.env.dev'] }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'dev-secret-change-in-production',
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    DatabaseModule,
    HealthModule,
    PaymentModule,
    SubscriptionModule,
    InvoiceModule,
    WebhookModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
