import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';

interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  email: string;
  role: string;
  message?: string;
}

interface GetUserByIdResponse {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AuthGrpcClient.name);
  private authServiceClient: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const grpcUrl = this.configService.get<string>('auth.grpcUrl');

    this.logger.log(`Initializing gRPC client for Auth Service at ${grpcUrl}...`);

    const PROTO_PATH = join(__dirname, '../../proto/auth.proto');

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const authProto = grpc.loadPackageDefinition(packageDefinition).auth as any;

    this.authServiceClient = new authProto.AuthService(
      grpcUrl,
      grpc.credentials.createInsecure(),
    );

    this.logger.log('gRPC client initialized successfully');
  }

  /**
   * Validate JWT token with auth-service
   */
  async validateToken(token: string): Promise<ValidateTokenResponse> {
    return new Promise((resolve, reject) => {
      this.authServiceClient.ValidateToken({ token }, (error: any, response: ValidateTokenResponse) => {
        if (error) {
          this.logger.error('gRPC ValidateToken error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get user by ID from auth-service
   */
  async getUserById(userId: string): Promise<GetUserByIdResponse> {
    return new Promise((resolve, reject) => {
      this.authServiceClient.GetUserById({ userId }, (error: any, response: GetUserByIdResponse) => {
        if (error) {
          this.logger.error('gRPC GetUserById error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }
}
