import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type ServiceName = 'auth' | 'user' | 'job' | 'application' | 'notification' | 'payment' | 'admin' | 'messaging' | 'recommendation';

@ApiTags('docs')
@Controller('docs')
export class DocsController {
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
      messaging: this.configService.get('MESSAGING_SERVICE_URL') || 'http://localhost:3008',
      recommendation: this.configService.get('RECOMMENDATION_SERVICE_URL') || 'http://localhost:3009',
    };
  }

  @Get()
  @ApiOperation({ summary: 'List available service documentation' })
  getDocsIndex() {
    return {
      message: 'AI Job Portal API Documentation',
      services: Object.keys(this.serviceUrls).map(name => ({
        name,
        swaggerJson: `/api/v1/docs/${name}/swagger.json`,
        ui: `/api/v1/docs/${name}`,
      })),
    };
  }

  @Get(':service/swagger.json')
  @ApiOperation({ summary: 'Get OpenAPI spec for a service' })
  @ApiParam({ name: 'service', enum: ['auth', 'user', 'job', 'application', 'notification', 'payment', 'admin', 'messaging', 'recommendation'] })
  async getSwaggerJson(@Param('service') service: ServiceName, @Res() res: FastifyReply) {
    const baseUrl = this.serviceUrls[service];
    if (!baseUrl) {
      return res.status(404).send({ error: 'Service not found' });
    }

    try {
      const response = await axios.get(`${baseUrl}/api/docs-json`, { timeout: 5000 });
      return res.send(response.data);
    } catch (error) {
      return res.status(502).send({ error: `Failed to fetch docs from ${service}` });
    }
  }

  @Get(':service')
  @ApiOperation({ summary: 'Swagger UI for a specific service' })
  @ApiParam({ name: 'service', enum: ['auth', 'user', 'job', 'application', 'notification', 'payment', 'admin', 'messaging', 'recommendation'] })
  async getSwaggerUI(@Param('service') service: ServiceName, @Res() res: FastifyReply) {
    if (!this.serviceUrls[service]) {
      return res.status(404).send({ error: 'Service not found' });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${service} - API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; }
    .topbar { display: none !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/docs/${service}/swagger.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`;

    res.header('Content-Type', 'text/html');
    return res.send(html);
  }
}
