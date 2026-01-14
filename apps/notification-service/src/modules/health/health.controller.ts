import { Controller, Get } from '@nestjs/common';
import { SERVICE_NAME } from '../../common/constants/service-name';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: SERVICE_NAME,
    };
  }

  // Future endpoints for infrastructure teams
  // @Get('live')
  // getLiveness() {
  //   return { status: 'ok', service: SERVICE_NAME };
  // }

  // @Get('ready')
  // async getReadiness() {
  //   // Phase 1+: Check queue/db connections
  //   return { status: 'ok', service: SERVICE_NAME };
  // }
}
