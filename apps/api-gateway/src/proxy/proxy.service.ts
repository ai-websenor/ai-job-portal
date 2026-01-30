import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

export type ServiceName =
  | 'auth'
  | 'user'
  | 'job'
  | 'application'
  | 'notification'
  | 'payment'
  | 'admin'
  | 'messaging'
  | 'recommendation';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly serviceUrls: Record<ServiceName, string>;

  constructor(private readonly configService: ConfigService) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    const serviceDefaults: Record<ServiceName, { envKey: string; defaultUrl: string }> = {
      auth: { envKey: 'AUTH_SERVICE_URL', defaultUrl: 'http://localhost:3001' },
      user: { envKey: 'USER_SERVICE_URL', defaultUrl: 'http://localhost:3002' },
      job: { envKey: 'JOB_SERVICE_URL', defaultUrl: 'http://localhost:3003' },
      application: { envKey: 'APPLICATION_SERVICE_URL', defaultUrl: 'http://localhost:3004' },
      notification: { envKey: 'NOTIFICATION_SERVICE_URL', defaultUrl: 'http://localhost:3005' },
      payment: { envKey: 'PAYMENT_SERVICE_URL', defaultUrl: 'http://localhost:3006' },
      admin: { envKey: 'ADMIN_SERVICE_URL', defaultUrl: 'http://localhost:3007' },
      messaging: { envKey: 'MESSAGING_SERVICE_URL', defaultUrl: 'http://localhost:3008' },
      recommendation: { envKey: 'RECOMMENDATION_SERVICE_URL', defaultUrl: 'http://localhost:3009' },
    };

    this.serviceUrls = {} as Record<ServiceName, string>;
    const missingInProduction: string[] = [];

    for (const [service, config] of Object.entries(serviceDefaults)) {
      const envValue = this.configService.get(config.envKey);
      this.serviceUrls[service as ServiceName] = envValue || config.defaultUrl;

      if (isProduction && !envValue) {
        missingInProduction.push(config.envKey);
      }
    }

    if (isProduction && missingInProduction.length > 0) {
      this.logger.warn(
        `Using localhost defaults for services in production: ${missingInProduction.join(', ')}`,
      );
    }
  }

  async forward(
    service: ServiceName,
    path: string,
    method: string,
    data?: any,
    headers?: Record<string, string>,
    isMultipart = false,
  ): Promise<any> {
    const baseUrl = this.serviceUrls[service];
    const url = `${baseUrl}${path}`;

    const config: AxiosRequestConfig = {
      method: method as any,
      url,
      data,
      headers: isMultipart
        ? headers // For multipart, use headers as-is (includes Content-Type with boundary)
        : {
            'Content-Type': 'application/json',
            ...headers,
          },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
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
