import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { AlertService } from './alert.service';
import { AlertListResponseDto } from './dto';

const CARD_SHAPE_DOC = `
### Card shape

Each alert is render-ready: \`title\`, \`message\`, \`severity\` (color), \`actionUrl\` + \`actionLabel\` (CTA),
and a \`meta\` object with type-specific data. \`id\` is stable per underlying entity so the frontend
can de-duplicate across polls.

### Pagination

Pass \`?limit=4\` for the top-N severity-ranked alerts (dashboard cards); omit \`limit\` to get the
full list (the "view all" screen). \`count\` is always the total number of available alerts,
independent of \`limit\`, so the frontend can decide whether to show a "view all" affordance.`;

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get('interviews')
  @Roles('employer', 'super_employer', 'candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get interview alerts',
    description: `Interview alerts for the authenticated user, computed live (not stored) and sorted
by severity (\`critical\` -> \`warning\` -> \`info\`).

| type | audience | trigger |
|------|----------|---------|
| \`interview_today\` | candidate & employer | An interview is scheduled for today (scheduled / confirmed / rescheduled), in the user's timezone |
${CARD_SHAPE_DOC}`,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 4 })
  @ApiResponse({ status: 200, description: 'List of interview alerts', type: AlertListResponseDto })
  @ApiResponse({ status: 403, description: 'Profile required' })
  getInterviewAlerts(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.alertService.getInterviewAlerts(userId, role, limit);
  }

  @Get('subscription')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get subscription alerts',
    description: `Subscription / account-health alerts for an employer, computed live (not stored)
and sorted by severity (\`critical\` -> \`warning\` -> \`info\`). Employer-only.

| type | audience | trigger |
|------|----------|---------|
| \`low_credits\` | employer | A subscription credit (job posting / resume access / featured job) has **2 or fewer** remaining. \`severity\` is \`critical\` when 0 left, otherwise \`warning\` |
| \`job_expiring\` | employer | An active job's deadline is **within the next 2 days** |
${CARD_SHAPE_DOC}`,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 4 })
  @ApiResponse({
    status: 200,
    description: 'List of subscription alerts',
    type: AlertListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Employer profile required' })
  getSubscriptionAlerts(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.alertService.getSubscriptionAlerts(userId, role, limit);
  }
}
