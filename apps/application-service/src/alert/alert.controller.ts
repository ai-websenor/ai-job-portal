import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { AlertService } from './alert.service';
import { AlertListResponseDto } from './dto';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  @Roles('employer', 'super_employer', 'candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get dashboard alerts',
    description: `Returns the current-state alerts for the authenticated user, intended for the
dashboard alert carousel. Alerts are computed live (not stored) and sorted by severity
(\`critical\` -> \`warning\` -> \`info\`).

### Alert types

| type | audience | trigger |
|------|----------|---------|
| \`interview_today\` | candidate & employer | An interview is scheduled for today (scheduled / confirmed / rescheduled), in the user's timezone |
| \`low_credits\` | employer only | A subscription credit (job posting / resume access / featured job) has **2 or fewer** remaining. \`severity\` is \`critical\` when 0 left, otherwise \`warning\` |
| \`job_expiring\` | employer only | An active job's deadline is **within the next 2 days** |

### Card shape

Each alert is render-ready: \`title\`, \`message\`, \`severity\` (color), \`actionUrl\` + \`actionLabel\` (CTA),
and a \`meta\` object with type-specific data. \`id\` is stable per underlying entity so the frontend
can de-duplicate across polls.`,
  })
  @ApiResponse({ status: 200, description: 'List of alerts', type: AlertListResponseDto })
  @ApiResponse({ status: 403, description: 'Employer/Candidate profile required' })
  getAlerts(@CurrentUser('sub') userId: string, @CurrentUser('role') role: string) {
    return this.alertService.getAlerts(userId, role);
  }
}
