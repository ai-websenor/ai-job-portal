import { Controller, Get, Headers, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@ai-job-portal/common';
import { JobDeepLinkService } from './job-deep-link.service';

@ApiExcludeController()
@Controller('link/event')
export class JobRedirectController {
  constructor(private readonly jobDeepLinkService: JobDeepLinkService) {}

  @Get(':jobId')
  @Public()
  async redirectShare(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() res: any,
  ) {
    const html = this.jobDeepLinkService.generateJobDeepLinkPage(jobId, userAgent);
    res.type('text/html').send(html);
  }
}
