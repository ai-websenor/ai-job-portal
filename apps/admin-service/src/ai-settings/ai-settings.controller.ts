import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { AiSettingsService } from './ai-settings.service';
import { UpdateAiSalarySourceDto } from './dto';

const overviewDescription = `
Everything the **AI Settings** tab shows, in one call.

### Salary prediction data sources

Salary prediction prices a job against the platform's own live adverts. On a
brand new database there are none, so every estimate honestly returns
"not enough data". The external source is an optional fallback for exactly that
cold start.

The order never changes, and it cannot be reordered from here:

| Order | Source | When used |
|---|---|---|
| 1 | Live job adverts on this platform | Always tried first |
| 2 | Curated \`salary_benchmarks\` rows | When too few adverts match |
| 3 | External salary source | Only when 1 and 2 both found nothing |

An estimate that comes from the external source is always labelled low
confidence, says on screen that it came from outside the platform, and never
produces the "your range is below similar roles" warning — that line claims a
comparison we did not make.

### Reading \`active\`

\`enabled\` is the admin's switch. \`active\` is whether the fallback can
actually do anything, which also needs a provider that exists. No provider has
been built yet, so \`availableProviders\` is empty and \`active\` is currently
always false.

### \`platformData\`

How much the platform can price from its own data right now. If
\`canPriceFromPlatformData\` is true, the fallback will almost never be reached
and turning it on changes little.

**Required role:** \`admin\` or \`super_admin\`
`.trim();

const updateDescription = `
Turn the external salary fallback on or off, and choose the source. Send only
what changes.

Both fields are optional, but at least one is required. \`provider\` must be an
id from \`availableProviders\`, or \`""\` to select none.

The change is recorded against your admin account. job-service caches these
settings for 60 seconds, so it takes effect within a minute.

Switching this on means job titles, skills, experience and city from employers'
draft job posts may be sent to a third party for pricing. That is why the
setting is attributable and off by default.

**Required role:** \`admin\` or \`super_admin\`
`.trim();

const overviewExample = {
  message: 'AI settings retrieved successfully',
  data: {
    salaryExternalSource: {
      enabled: false,
      provider: null,
      providerAvailable: false,
      active: false,
      availableProviders: [],
      updatedAt: '2026-10-07T09:12:44.000Z',
    },
    platformData: {
      pricedActiveJobs: 57,
      benchmarkRows: 12,
      canPriceFromPlatformData: true,
    },
  },
};

/**
 * The AI Settings tab.
 *
 * Public path through the gateway: `/api/v1/admin/ai-settings`, which the
 * existing `admin/*` proxy route already covers.
 */
@ApiTags('ai-settings')
@ApiBearerAuth()
@Controller('admin/ai-settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get AI settings and data-source health',
    description: overviewDescription,
  })
  @ApiResponse({
    status: 200,
    description: 'Current AI settings.',
    schema: { example: overviewExample },
  })
  async overview() {
    const data = await this.aiSettingsService.overview();
    return { message: 'AI settings retrieved successfully', data };
  }

  @Patch('salary-external-source')
  @ApiOperation({
    summary: 'Enable, disable or re-point the external salary source',
    description: updateDescription,
  })
  @ApiResponse({
    status: 200,
    description: 'The saved settings, re-read from the database.',
    schema: { example: overviewExample },
  })
  @ApiResponse({
    status: 400,
    description: 'Nothing to change, or a provider that has not been built.',
  })
  async updateSalarySource(
    @CurrentUser('sub') adminId: string,
    @Body() dto: UpdateAiSalarySourceDto,
  ) {
    const data = await this.aiSettingsService.updateSalarySource(dto, adminId);
    return { message: 'AI settings updated successfully', data };
  }
}
