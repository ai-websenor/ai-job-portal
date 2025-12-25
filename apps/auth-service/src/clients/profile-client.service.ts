import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface CreateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
}

@Injectable()
export class ProfileClientService {
    private readonly logger = new Logger(ProfileClientService.name);
    private readonly userServiceUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) {
        this.userServiceUrl = this.configService.get<string>(
            'USER_SERVICE_URL',
            'http://localhost:3002',
        );
    }

    /**
     * Create a profile in the user-service
     * This is called after user registration
     */
    async createProfile(
        userId: string,
        email: string,
        role: string,
        profileData: CreateProfileDto,
    ): Promise<any> {
        try {
            this.logger.log(`Creating profile for user ${userId}`);

            const url = `${this.userServiceUrl}/api/v1/candidate/profile`;

            // Generate an internal service token for authentication
            const internalToken = this.jwtService.sign(
                {
                    sub: userId,
                    email,
                    role,
                    sessionId: 'internal-service-call',
                },
                {
                    expiresIn: '30s', // Short-lived token for internal use
                },
            );

            const response = await firstValueFrom(
                this.httpService.post(
                    url,
                    { ...profileData, email },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${internalToken}`,
                        },
                        timeout: 5000, // 5 second timeout
                    },
                ),
            );

            this.logger.log(`Profile created successfully for user ${userId}`);
            return response.data;
        } catch (error) {
            // Log error but don't throw - we don't want profile creation failure to block registration
            if (error instanceof AxiosError) {
                this.logger.error(
                    `Failed to create profile for user ${userId}: ${error.message}`,
                    error.response?.data,
                );
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(
                    `Failed to create profile for user ${userId}: ${errorMessage}`,
                );
            }

            // Return null to indicate failure without throwing
            return null;
        }
    }
}
