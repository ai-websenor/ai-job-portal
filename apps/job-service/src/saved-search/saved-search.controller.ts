import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { SavedSearchService } from './saved-search.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto, SavedSearchQueryDto } from './dto';

// ─── Reusable response shape for Swagger examples ───────────────────────────

const SAVED_SEARCH_EXAMPLE = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  userId: 'user-uuid-here',
  name: 'Full Stack Jobs · Remote · ₹5L–₹15L',
  searchCriteria: JSON.stringify({
    keyword: 'React Developer',
    location: 'Bangalore',
    jobType: ['full_time'],
    workMode: ['remote', 'hybrid'],
    skills: ['React', 'TypeScript', 'Node.js'],
    salaryMin: 500000,
    salaryMax: 1500000,
  }),
  alertEnabled: true,
  alertFrequency: 'instant',
  alertChannels: 'email,push',
  alertCount: 7,
  lastAlertSent: '2024-03-10T08:00:00Z',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-03-10T08:00:00Z',
};

// ─── How to build searchCriteria from search URL ─────────────────────────────

const CREATE_EXAMPLES = {
  fromSearchPage: {
    summary: '✅ Typical — built from job search page filters',
    description: `
Convert active search URL params to searchCriteria:

URL: /search/jobs?jobType=full_time&workModes=remote&locationType=remote,hybrid&salaryMin=500000&salaryMax=1500000&query=React

Rules:
- query           → keyword
- workModes       → workMode (merge with locationType, deduplicate)
- locationType    → workMode (merge with workModes, deduplicate)
- salaryMin/Max   → salaryMin/salaryMax (keep as numbers)
- company, companyType, industry, department, experienceLevels, payRate → DROP (not matched)
- sortBy, page, limit, postedWithin → DROP (display only)
    `.trim(),
    value: {
      name: 'React Jobs · Remote · ₹5L–₹15L',
      searchCriteria: JSON.stringify({
        keyword: 'React',
        jobType: ['full_time'],
        workMode: ['remote', 'hybrid'],
        salaryMin: 500000,
        salaryMax: 1500000,
      }),
      alertEnabled: true,
      alertFrequency: 'instant',
      alertChannels: 'email,push',
    },
  },
  withLocation: {
    summary: '📍 With location + skills',
    description: 'Save a location-specific search with required skills.',
    value: {
      name: 'Node.js Jobs in Hyderabad',
      searchCriteria: JSON.stringify({
        keyword: 'Node.js',
        location: 'Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        skills: ['Node.js', 'PostgreSQL', 'Docker'],
        jobType: ['full_time', 'contract'],
      }),
      alertEnabled: true,
      alertFrequency: 'daily',
      alertChannels: 'email,push',
    },
  },
  allJobsAlert: {
    summary: '🔔 Alert for all jobs (no filters)',
    description:
      'Empty searchCriteria matches every job posted. Use with caution — can generate many alerts.',
    value: {
      name: 'All New Jobs',
      searchCriteria: '{}',
      alertEnabled: true,
      alertFrequency: 'weekly',
      alertChannels: 'email',
    },
  },
  withCategory: {
    summary: '🗂️ Category + salary range',
    value: {
      name: 'Senior Dev Jobs · High Salary',
      searchCriteria: JSON.stringify({
        categoryId: 'replace-with-actual-category-uuid',
        salaryMin: 2000000,
        workMode: ['remote'],
      }),
      alertEnabled: true,
      alertFrequency: 'instant',
      alertChannels: 'email,push',
    },
  },
};

const UPDATE_EXAMPLES = {
  changeFrequency: {
    summary: '🕐 Change alert frequency only',
    value: { alertFrequency: 'weekly', alertChannels: 'email' },
  },
  updateCriteria: {
    summary: '🔄 Update search criteria',
    description: 'Rebuild searchCriteria from current filter state and send the updated string.',
    value: {
      name: 'React + Next.js Remote Jobs',
      searchCriteria: JSON.stringify({
        keyword: 'React',
        skills: ['React', 'Next.js', 'TypeScript'],
        workMode: ['remote'],
        salaryMin: 1000000,
      }),
    },
  },
  deactivate: {
    summary: '⏸️ Soft-deactivate without deleting',
    value: { isActive: false },
  },
  disableAlerts: {
    summary: '🔕 Keep search, disable alerts',
    value: { alertEnabled: false },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Saved Searches (Job Alerts)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users/me/saved-searches')
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  // ─── POST / ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create a saved search / job alert',
    description: `
Saves the current job search filters as a named alert. When an employer publishes a job that matches the saved criteria, the candidate is notified via the configured channels.

**How it works:**
1. Candidate sets filters on the search page and clicks "Save Search" or "Get Job Alerts"
2. Frontend reads current active filter state and converts to \`searchCriteria\` JSON
3. Candidate picks frequency (\`instant\` / \`daily\` / \`weekly\`) and channels (\`email\`, \`push\`, \`sms\`)
4. On job publish, backend matches all active instant saved searches and sends notifications

**Limit:** Maximum **5 saved searches** per user. Returns \`400\` if exceeded.

**searchCriteria field mapping from search URL:**

| Search URL param | searchCriteria key | Notes |
|---|---|---|
| \`query\` | \`keyword\` | Rename |
| \`location\` | \`location\` | Keep |
| \`categoryId\` | \`categoryId\` | Keep |
| \`jobType\` | \`jobType\` | Keep (array) |
| \`workModes\` + \`locationType\` | \`workMode\` | Merge both, deduplicate |
| \`salaryMin\` | \`salaryMin\` | Keep (number) |
| \`salaryMax\` | \`salaryMax\` | Keep (number) |
| \`skillIds\` | \`skills\` | Resolve to **name strings** first |
| \`company\`, \`companyType\`, \`industry\`, \`department\`, \`experienceLevels\`, \`payRate\`, \`sortBy\`, \`postedWithin\`, \`page\`, \`limit\` | ❌ Drop | Not used for matching |
    `.trim(),
  })
  @ApiBody({ type: CreateSavedSearchDto, examples: CREATE_EXAMPLES })
  @ApiResponse({
    status: 201,
    description: 'Saved search created. Returns the full saved search object.',
    schema: {
      example: {
        message: 'Search saved successfully',
        data: { ...SAVED_SEARCH_EXAMPLE, alertCount: 0, lastAlertSent: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or max 5 saved searches limit reached',
    schema: {
      example: { message: 'You can have a maximum of 5 saved searches', statusCode: 400 },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid token' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateSavedSearchDto) {
    const savedSearch = await this.savedSearchService.create(userId, dto);
    return { message: 'Search saved successfully', data: savedSearch };
  }

  // ─── GET / ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all saved searches for the current user',
    description: `
Returns all saved searches belonging to the authenticated candidate, ordered newest first.

**Use on:** Job alerts management page or dashboard widget.

**Display tips:**
- Show \`alertCount\` as "12 alerts sent" and \`lastAlertSent\` as "Last match: Jan 10"
- Show current saved search count to enforce the 5-alert limit in the UI (e.g. \`2 / 5 alerts\`)
- Parse \`searchCriteria\` JSON to display a human-readable summary of the filters
- Render \`alertEnabled\` as a toggle switch — use \`PUT /:id/toggle-alerts\` on change
    `.trim(),
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status. Omit to return all.',
    example: true,
  })
  @ApiQuery({
    name: 'alertEnabled',
    required: false,
    type: Boolean,
    description: 'Filter to only alert-enabled searches. Omit to return all.',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of saved searches. Max 5 items.',
    schema: {
      example: {
        message: 'Saved searches fetched successfully',
        data: [
          SAVED_SEARCH_EXAMPLE,
          {
            id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            userId: 'user-uuid-here',
            name: 'Node.js Jobs in Hyderabad',
            searchCriteria: JSON.stringify({
              keyword: 'Node.js',
              location: 'Hyderabad',
              skills: ['Node.js', 'PostgreSQL'],
            }),
            alertEnabled: false,
            alertFrequency: 'daily',
            alertChannels: 'email',
            alertCount: 2,
            lastAlertSent: '2024-02-20T06:00:00Z',
            isActive: true,
            createdAt: '2024-02-01T00:00:00Z',
            updatedAt: '2024-02-20T06:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser('sub') userId: string, @Query() query: SavedSearchQueryDto) {
    const savedSearches = await this.savedSearchService.findAll(userId, query);
    return { message: 'Saved searches fetched successfully', data: savedSearches };
  }

  // ─── GET /:id ──────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single saved search by ID',
    description: 'Fetch full details of one saved search. Use when opening the edit screen.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the saved search',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved search details',
    schema: {
      example: {
        message: 'Saved search fetched successfully',
        data: SAVED_SEARCH_EXAMPLE,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Saved search not found or does not belong to this user',
    schema: { example: { message: 'Saved search not found', statusCode: 404 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const savedSearch = await this.savedSearchService.findOne(userId, id);
    return { message: 'Saved search fetched successfully', data: savedSearch };
  }

  // ─── PUT /:id ──────────────────────────────────────────────────────────────

  @Put(':id')
  @ApiOperation({
    summary: 'Update a saved search',
    description: `
Partial update — only send the fields you want to change.

**Common use cases:**
- User edits the alert name
- User changes frequency from \`instant\` to \`daily\`
- User changes channels from \`email,push\` to \`email\`
- User re-runs search with new filters and re-saves (send updated \`searchCriteria\`)
- Soft-deactivate without deleting: \`{ "isActive": false }\`

**Note:** To toggle alerts on/off with a switch, prefer \`PUT /:id/toggle-alerts\` instead.
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the saved search to update',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiBody({ type: UpdateSavedSearchDto, examples: UPDATE_EXAMPLES })
  @ApiResponse({
    status: 200,
    description: 'Returns the full updated saved search object',
    schema: {
      example: {
        message: 'Saved search updated successfully',
        data: { ...SAVED_SEARCH_EXAMPLE, alertFrequency: 'weekly', alertChannels: 'email' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Saved search not found',
    schema: { example: { message: 'Saved search not found', statusCode: 404 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    const savedSearch = await this.savedSearchService.update(userId, id, dto);
    return { message: 'Saved search updated successfully', data: savedSearch };
  }

  // ─── DELETE /:id ───────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a saved search',
    description: `
Permanently deletes the saved search. No undo.

After deletion the user can create a new one (frees up one slot from the 5-alert limit).

**Alternative:** Use \`PUT /:id\` with \`{ "isActive": false }\` to soft-deactivate instead.
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the saved search to delete',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved search permanently deleted',
    schema: {
      example: { message: 'Saved search deleted successfully', data: {} },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Saved search not found',
    schema: { example: { message: 'Saved search not found', statusCode: 404 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.savedSearchService.remove(userId, id);
    return { message: 'Saved search deleted successfully', data: {} };
  }

  // ─── PUT /:id/toggle-alerts ────────────────────────────────────────────────

  @Put(':id/toggle-alerts')
  @ApiOperation({
    summary: 'Toggle alerts on/off for a saved search',
    description: `
Flips the \`alertEnabled\` flag without any request body.

- If \`alertEnabled\` was \`true\` → becomes \`false\` (alerts paused)
- If \`alertEnabled\` was \`false\` → becomes \`true\` (alerts resumed)

**Use case:** Alert toggle switch in the UI. Call this endpoint directly on switch change.
No request body needed — just call \`PUT /:id/toggle-alerts\`.

**Do NOT use \`PUT /:id\` with \`alertEnabled\` field for toggling** — use this dedicated endpoint instead, as it guarantees atomic flip without race conditions.
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the saved search',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description:
      'Alert toggled. Returns the full updated saved search with new alertEnabled value.',
    schema: {
      examples: {
        toggled_off: {
          summary: 'Alert turned OFF (was on)',
          value: {
            message: 'Alerts toggled successfully',
            data: { ...SAVED_SEARCH_EXAMPLE, alertEnabled: false },
          },
        },
        toggled_on: {
          summary: 'Alert turned ON (was off)',
          value: {
            message: 'Alerts toggled successfully',
            data: { ...SAVED_SEARCH_EXAMPLE, alertEnabled: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Saved search not found',
    schema: { example: { message: 'Saved search not found', statusCode: 404 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async toggleAlerts(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.savedSearchService.toggleAlerts(userId, id);
    return { message: 'Alerts toggled successfully', data: result };
  }
}
