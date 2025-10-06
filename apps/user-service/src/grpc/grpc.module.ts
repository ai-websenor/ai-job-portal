import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthGrpcClient } from './auth-grpc.client';

@Module({
  imports: [ConfigModule],
  providers: [AuthGrpcClient],
  exports: [AuthGrpcClient],
})
export class GrpcModule {}
