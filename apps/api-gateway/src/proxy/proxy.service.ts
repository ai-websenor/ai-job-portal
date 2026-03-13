import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import FormData from 'form-data';

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

    // Fallback: Use ALB/Gateway URL for service communication when specific URLs aren't set
    // This allows services to communicate through the same load balancer
    const internalServiceBaseUrl = this.configService.get('INTERNAL_SERVICE_BASE_URL');

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

      if (envValue) {
        // Use explicitly configured service URL
        this.serviceUrls[service as ServiceName] = envValue;
      } else if (isProduction && internalServiceBaseUrl) {
        // In production without specific service URLs, use the ALB/Gateway base URL
        // This allows all services to communicate through the same load balancer
        this.serviceUrls[service as ServiceName] = internalServiceBaseUrl;
        this.logger.log(
          `Using INTERNAL_SERVICE_BASE_URL for ${service}: ${internalServiceBaseUrl}`,
        );
      } else {
        // Development: use localhost
        this.serviceUrls[service as ServiceName] = config.defaultUrl;
        if (isProduction) {
          missingInProduction.push(config.envKey);
        }
      }
    }

    if (isProduction && missingInProduction.length > 0 && !internalServiceBaseUrl) {
      this.logger.warn(
        `⚠️  Missing service URLs in production. Set INTERNAL_SERVICE_BASE_URL or individual service URLs: ${missingInProduction.join(', ')}`,
      );
    }

    if (internalServiceBaseUrl) {
      this.logger.log(
        `✅ Using INTERNAL_SERVICE_BASE_URL for service communication: ${internalServiceBaseUrl}`,
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

    let requestData = data;
    let requestHeaders = { ...headers };

    // For multipart requests, reconstruct FormData from parsed data
    if (isMultipart && data) {
      const formData = new FormData();

      // Add all text fields
      if (data.fields) {
        for (const [key, value] of Object.entries(data.fields)) {
          formData.append(key, value as string);
        }
      }

      // Add all files
      if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
          formData.append(file.fieldname, file.buffer, {
            filename: file.filename,
            contentType: file.mimetype,
          });
        }
      }

      requestData = formData;

      // Update headers with FormData headers (includes proper Content-Type with boundary)
      const formHeaders = formData.getHeaders();
      requestHeaders = {
        ...headers,
        ...formHeaders,
      };
    }

    const config: AxiosRequestConfig = {
      method: method as any,
      url,
      data: requestData,
      headers: isMultipart
        ? requestHeaders
        : {
            'Content-Type': 'application/json',
            ...requestHeaders,
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
