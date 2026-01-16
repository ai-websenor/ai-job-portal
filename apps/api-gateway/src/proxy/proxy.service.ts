import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

export type ServiceName = 'auth' | 'user' | 'job' | 'application' | 'notification' | 'payment' | 'admin';

@Injectable()
export class ProxyService {
  private readonly serviceUrls: Record<ServiceName, string>;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrls = {
      auth: this.configService.get('AUTH_SERVICE_URL') || 'http://localhost:3001',
      user: this.configService.get('USER_SERVICE_URL') || 'http://localhost:3002',
      job: this.configService.get('JOB_SERVICE_URL') || 'http://localhost:3003',
      application: this.configService.get('APPLICATION_SERVICE_URL') || 'http://localhost:3004',
      notification: this.configService.get('NOTIFICATION_SERVICE_URL') || 'http://localhost:3005',
      payment: this.configService.get('PAYMENT_SERVICE_URL') || 'http://localhost:3006',
      admin: this.configService.get('ADMIN_SERVICE_URL') || 'http://localhost:3007',
    };
  }

  async forward(
    service: ServiceName,
    path: string,
    method: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const baseUrl = this.serviceUrls[service];
    const url = `${baseUrl}${path}`;

    const config: AxiosRequestConfig = {
      method: method as any,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 30000,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      throw new HttpException('Service unavailable', 503);
    }
  }

  getServiceUrl(service: ServiceName): string {
    return this.serviceUrls[service];
  }
}
