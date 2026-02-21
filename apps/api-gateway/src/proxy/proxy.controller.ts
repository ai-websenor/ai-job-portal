/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, All, Req, Res, Param, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ProxyService, ServiceName } from './proxy.service';
import { FastifyRequest, FastifyReply } from 'fastify';

@ApiTags('proxy')
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  // Auth Service Routes
  @All('auth/*')
  @ApiExcludeEndpoint()
  async proxyAuth(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('auth', req, res);
  }

  // OAuth Routes (proxied to Auth Service)
  @All('oauth/*')
  @ApiExcludeEndpoint()
  async proxyOAuth(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('auth', req, res);
  }

  // Company-Employer Management Routes (proxied to User Service - super_employer)
  @All('company-employers')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompanyEmployersRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('company-employers/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompanyEmployers(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  // Company Profile Routes (proxied to User Service)
  @All('company/profile')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompanyProfile(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  // Company Upload Routes (proxied to User Service - logo, banner, verification docs)
  @All('company/logo')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompanyLogo(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('company/banner')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompanyBanner(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('company/verification-document/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompanyVerificationDocSub(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  // Company Registration Routes (proxied to Auth Service)
  @All('company/*')
  @ApiExcludeEndpoint()
  async proxyCompanyRegistration(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
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

  @All('resumes')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyResumesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('companies')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompaniesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('companies/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyCompanies(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  // Resume Templates Routes
  @All('resume-templates')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyResumeTemplatesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('resume-templates/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyResumeTemplates(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  // Public career pages
  @All('careers/*')
  @ApiExcludeEndpoint()
  async proxyCareers(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  // Avatar Routes (admin service)
  @All('avatars')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyAvatarsRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('avatars/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyAvatars(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  // Job Service Routes
  @All('jobs')
  @ApiExcludeEndpoint()
  async proxyJobsRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('job', req, res);
  }

  @All('jobs/*')
  @ApiExcludeEndpoint()
  async proxyJobs(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('job', req, res);
  }

  @All('categories')
  @ApiExcludeEndpoint()
  async proxyCategoriesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('job', req, res);
  }

  @All('categories/*')
  @ApiExcludeEndpoint()
  async proxyCategories(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('job', req, res);
  }

  @All('search/*')
  @ApiExcludeEndpoint()
  async proxySearch(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('job', req, res);
  }

  @All('skills')
  @ApiExcludeEndpoint()
  async proxySkillsRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('skills/*')
  @ApiExcludeEndpoint()
  async proxySkills(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  // Public Education Routes (no auth — candidate onboarding)
  @All('degrees')
  @ApiExcludeEndpoint()
  async proxyDegreesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('degrees/*')
  @ApiExcludeEndpoint()
  async proxyDegrees(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  // Application Service Routes
  @All('applications')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyApplicationsRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('application', req, res);
  }

  @All('applications/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyApplications(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('application', req, res);
  }

  @All('interviews')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyInterviewsRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('application', req, res);
  }

  @All('interviews/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyInterviews(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('application', req, res);
  }

  // Notification Service Routes
  @All('notifications')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyNotificationsRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('notification', req, res);
  }

  @All('notifications/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyNotifications(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('notification', req, res);
  }

  @All('preferences')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyPreferencesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('notification', req, res);
  }

  @All('preferences/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyPreferences(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
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

  @All('invoices')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyInvoicesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('payment', req, res);
  }

  @All('invoices/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyInvoices(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('payment', req, res);
  }

  // Master Data Routes (proxied to user-service)
  @All('master-data')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyMasterDataRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  @All('master-data/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyMasterData(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('user', req, res);
  }

  // Admin Service Routes
  @All('admin/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyAdmin(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  // RBAC Routes (Role-Based Access Control)
  @All('rbac')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyRbacRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('rbac/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyRbac(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('reports/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyReports(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('blog')
  @ApiExcludeEndpoint()
  async proxyBlogRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('blog/*')
  @ApiExcludeEndpoint()
  async proxyBlog(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  @All('support/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxySupport(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('admin', req, res);
  }

  // Messaging Service Routes
  @All('messages')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyMessagesRoot(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('messaging', req, res);
  }

  @All('messages/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyMessages(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('messaging', req, res);
  }

  @All('chat/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyChat(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('messaging', req, res);
  }

  // Recommendation Service Routes
  @All('recommendations/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyRecommendations(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('recommendation', req, res);
  }

  @All('interactions/*')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  async proxyInteractionsRec(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.proxyRequest('recommendation', req, res);
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
      this.logger.log(`🌐 User object: ${JSON.stringify((req as any).user)}`);
      headers['X-User-Id'] = (req as any).user.sub;
      headers['X-User-Role'] = (req as any).user.role;
      this.logger.log(
        `✅ Added headers - X-User-Id: ${(req as any).user.sub}, X-User-Role: ${(req as any).user.role}`,
      );
      // Add company ID for admin/employer users (used for company-scoped access control)
      if ((req as any).user.companyId) {
        headers['X-Company-Id'] = (req as any).user.companyId;
        this.logger.log(`✅ Added X-Company-Id header: ${(req as any).user.companyId}`);
      } else {
        this.logger.warn(`⚠️  No companyId in user object`);
      }
    } else {
      this.logger.warn(
        `⚠️  No user object found - headers will not include X-User-Id or X-User-Role`,
      );
    }

    // Check if this is a multipart request
    const contentType = req.headers['content-type'];
    const isMultipart = contentType?.includes('multipart/form-data');

    // For multipart, forward the Content-Type with boundary
    if (isMultipart && contentType) {
      headers['Content-Type'] = contentType;
    }

    // Use raw stream for multipart, parsed body for JSON
    const data = isMultipart ? req.raw : req.body;

    try {
      const result = await this.proxyService.forward(
        service,
        path,
        req.method,
        data,
        headers,
        isMultipart,
      );
      return res.send(result);
    } catch (error: any) {
      return res.status(error.status || 500).send(error.response || { error: 'Internal error' });
    }
  }
}
