import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from '../auth/services/auth.service';
import { UserService } from '../user/services/user.service';
import { SessionService } from '../session/services/session.service';

interface ValidateTokenRequest {
  token: string;
}

interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  email: string;
  role: string;
  message?: string;
}

interface GetUserByIdRequest {
  userId: string;
}

interface GetUserByIdResponse {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

@Controller()
export class GrpcController {
  private readonly logger = new Logger(GrpcController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
    // Strip "Bearer " prefix if present (fixes issue where client sends full header)
    const token = data.token.replace(/^Bearer\s+/i, '');
    this.logger.log(`gRPC ValidateToken called with token: ${token.substring(0, 20)}...`);

    try {
      // Verify JWT token signature and expiration
      const payload = await this.authService.verifyToken(token);

      // Validate session exists and is not expired
      const session = await this.sessionService.findById(payload.sessionId);

      if (!session) {
        this.logger.warn(`Session not found for sessionId: ${payload.sessionId}`);
        return {
          valid: false,
          userId: '',
          email: '',
          role: '',
          message: 'Session not found. Please login again',
        };
      }

      // Check if session is expired
      if (!this.sessionService.isSessionValid(session)) {
        this.logger.warn(`Session expired for sessionId: ${payload.sessionId}, userId: ${payload.sub}`);

        // Delete expired session from database
        await this.sessionService.deleteSession(session.id);

        return {
          valid: false,
          userId: '',
          email: '',
          role: '',
          message: 'Session expired. Please login again',
        };
      }

      // Validate user exists and is active
      const user = await this.userService.findById(payload.sub);

      if (!user) {
        this.logger.warn(`User not found for userId: ${payload.sub}`);
        return {
          valid: false,
          userId: '',
          email: '',
          role: '',
          message: 'User not found',
        };
      }

      if (!user.isActive) {
        this.logger.warn(`User account is deactivated for userId: ${payload.sub}`);
        return {
          valid: false,
          userId: '',
          email: '',
          role: '',
          message: 'Account is deactivated',
        };
      }

      this.logger.log(`Token validated successfully for user: ${user.email}, sessionId: ${payload.sessionId}`);

      return {
        valid: true,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token validation failed: ${errorMessage}`);
      return {
        valid: false,
        userId: '',
        email: '',
        role: '',
        message: errorMessage,
      };
    }
  }

  @GrpcMethod('AuthService', 'GetUserById')
  async getUserById(data: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    this.logger.log(`gRPC GetUserById called with userId: ${data.userId}`);

    try {
      const user = await this.userService.findById(data.userId);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isVerified,
        isActive: user.isActive,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Get user by ID failed: ${errorMessage}`);
      throw error;
    }
  }
}
