import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  liveness() {
    return { status: 'alive' };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  readiness() {
    return { status: 'ready' };
  }
}
