import { Controller, All, Req, Res, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ProxyService, ServiceName } from './proxy.service';
import { FastifyRequest, FastifyReply } from 'fastify';

@ApiTags('proxy')
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  // Auth Service Routes
  @All('auth/*')
  @ApiExcludeEndpoint()
  async proxyAuth(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('auth', req, res);
  }

  // User Service Routes
  @All('users/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyUsers(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('candidates/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCandidates(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('employers/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyEmployers(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('resumes/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyResumes(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  // Job Service Routes
  @All('jobs/*')
  @ApiExcludeEndpoint()
  async proxyJobs(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('job', req, res);
  }

  @All('categories/*')
  @ApiExcludeEndpoint()
  async proxyCategories(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('job', req, res);
  }

  // Application Service Routes
  @All('applications/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyApplications(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('application', req, res);
  }

  @All('interviews/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyInterviews(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('application', req, res);
  }

  // Notification Service Routes
  @All('notifications/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyNotifications(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('notification', req, res);
  }

  // Payment Service Routes
  @All('payments/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyPayments(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('payment', req, res);
  }

  @All('subscriptions/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxySubscriptions(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('payment', req, res);
  }

  // Admin Service Routes
  @All('admin/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyAdmin(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  private async proxyRequest(service: ServiceName, req: FastifyRequest, res: FastifyReply) {
    const path = `/api/v1${req.url.replace('/api/v1', '')}`;
    const headers: Record<string, string> = {};

    // Forward authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }

    // Forward user info if authenticated
    if ((req as any).user) {
      headers['X-User-Id'] = (req as any).user.sub;
      headers['X-User-Role'] = (req as any).user.role;
    }

    try {
      const result = await this.proxyService.forward(
        service,
        path,
        req.method,
        req.body,
        headers,
      );
      return res.send(result);
    } catch (error: any) {
      return res.status(error.status || 500).send(error.response || { error: 'Internal error' });
    }
  }
}
