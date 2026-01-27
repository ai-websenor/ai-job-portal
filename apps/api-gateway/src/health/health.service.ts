import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly services: { name: string; url: string }[];

  constructor(private readonly configService: ConfigService) {
    this.services = [
      { name: 'auth-service', url: this.configService.get('AUTH_SERVICE_URL') || 'http://localhost:3001' },
      { name: 'user-service', url: this.configService.get('USER_SERVICE_URL') || 'http://localhost:3002' },
      { name: 'job-service', url: this.configService.get('JOB_SERVICE_URL') || 'http://localhost:3003' },
      { name: 'application-service', url: this.configService.get('APPLICATION_SERVICE_URL') || 'http://localhost:3004' },
      { name: 'notification-service', url: this.configService.get('NOTIFICATION_SERVICE_URL') || 'http://localhost:3005' },
      { name: 'payment-service', url: this.configService.get('PAYMENT_SERVICE_URL') || 'http://localhost:3006' },
      { name: 'admin-service', url: this.configService.get('ADMIN_SERVICE_URL') || 'http://localhost:3007' },
      { name: 'messaging-service', url: this.configService.get('MESSAGING_SERVICE_URL') || 'http://localhost:3008' },
      { name: 'recommendation-service', url: this.configService.get('RECOMMENDATION_SERVICE_URL') || 'http://localhost:3009' },
    ];
  }

  async checkAllServices(): Promise<{ gateway: string; services: ServiceHealth[] }> {
    const results = await Promise.all(
      this.services.map(async (service): Promise<ServiceHealth> => {
        const startTime = Date.now();
        try {
          await axios.get(`${service.url}/api/v1/health`, { timeout: 5000 });
          return {
            name: service.name,
            status: 'healthy',
            responseTime: Date.now() - startTime,
          };
        } catch (error: any) {
          return {
            name: service.name,
            status: 'unhealthy',
            error: error.message,
          };
        }
      }),
    );

    return {
      gateway: 'healthy',
      services: results,
    };
  }
}
