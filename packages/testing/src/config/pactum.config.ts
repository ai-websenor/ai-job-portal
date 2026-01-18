import { request, settings } from 'pactum';

export interface PactumConfigOptions {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

/**
 * Configure Pactum for E2E testing
 */
export function configurePactum(options: PactumConfigOptions): void {
  const { baseUrl, timeout = 30000, defaultHeaders = {} } = options;

  request.setBaseUrl(baseUrl);
  request.setDefaultTimeout(timeout);

  // Set default headers
  Object.entries(defaultHeaders).forEach(([key, value]) => {
    request.setDefaultHeaders(key, value);
  });

  // Configure settings
  settings.setLogLevel('ERROR');
}

/**
 * Get service base URL from environment or default
 */
export function getServiceUrl(service: string, defaultPort: number): string {
  const envKey = `${service.toUpperCase().replace('-', '_')}_URL`;
  return process.env[envKey] || `http://localhost:${defaultPort}`;
}

/**
 * Default ports for each service
 */
export const SERVICE_PORTS: Record<string, number> = {
  'api-gateway': 3000,
  'auth-service': 3001,
  'user-service': 3002,
  'job-service': 3003,
  'application-service': 3004,
  'notification-service': 3005,
  'payment-service': 3006,
  'admin-service': 3007,
  'messaging-service': 3008,
  'recommendation-service': 3009,
};
