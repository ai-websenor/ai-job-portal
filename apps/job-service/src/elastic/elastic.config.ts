import { ConfigService } from '@nestjs/config';

export const getElasticsearchConfig = (configService: ConfigService) => ({
  node:
    configService.get<string>('ELASTICSEARCH_URL') || 'http://localhost:9200',
  maxRetries: 3,
  requestTimeout: 10000,
  sniffOnStart: false,
});
