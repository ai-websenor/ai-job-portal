import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '@ai-job-portal/common';
import { MasterDataService } from './master-data.service';
import { ListMasterDataDto, UpdateMasterDataDto } from './dto';

// ============================================================================
// Shared Swagger prose. The three resources behave identically, so the
// descriptions are written once and the label swapped in.
// ============================================================================

const listDescription = (label: string, plural: string) =>
  `
Paginated review list of **${plural}**, both types:

| Type | Meaning |
|---|---|
| \`master-typed\` | Reviewed by an admin — curated master data |
| \`user-typed\` | Typed by an employer on the job form and not yet reviewed |

User-typed rows already appear in the employer dropdown (same as skills), so this
screen is about tidying rather than gatekeeping: correct a spelling, promote the
good ones to \`master-typed\`, deactivate the rubbish.

Rows are ordered by type, then name. Omitting \`isActive\` includes deactivated
rows, so a soft-deleted ${label} can be found and brought back.

**Required role:** \`admin\` or \`super_admin\`
`.trim();

const patchDescription = (label: string) =>
  `
Rename, promote or reactivate one ${label}. All fields optional — send only what changes.

**The promote action:**
1. An employer types a ${label} that matches nothing → stored as \`user-typed\`
2. Admin reviews it via \`GET\` on this resource with \`?type=user-typed\`
3. Admin fixes the spelling and sends \`{ "type": "master-typed" }\` here
4. It is now curated master data

Renaming is checked against the unique \`lower(btrim(name))\` index first, so a
clash returns **409** rather than leaking a database constraint error.

**Required role:** \`admin\` or \`super_admin\`
`.trim();

const deleteDescription = (label: string) =>
  `
Soft delete — sets \`isActive: false\`. Never a hard delete.

\`jobs.title\`, \`jobs.qualification\` and \`jobs.certification\` are plain text
columns with no foreign key to these tables, so deactivating a row cannot alter
a job that already exists. The ${label} simply drops out of the employer
dropdowns, and \`PATCH { "isActive": true }\` brings it back.

**Required role:** \`admin\` or \`super_admin\`
`.trim();

const listExample = (rows: unknown[]) => ({
  status: 200,
  description: 'Paginated rows',
  schema: {
    example: {
      data: {
        items: rows,
        pagination: { page: 1, limit: 15, total: 59, totalPages: 4 },
      },
      message: 'Operation successful',
      status: 'success',
      statusCode: 200,
    },
  },
});

const rowExample = (message: string, row: unknown) => ({
  status: 200,
  description: message,
  schema: {
    example: { data: row, message, status: 'success', statusCode: 200 },
  },
});

const AUTH_RESPONSES = [
  { status: 401, description: 'Unauthorized' },
  { status: 403, description: 'Forbidden — insufficient role' },
] as const;

// ============================================================================
// Job titles
// ============================================================================

@ApiTags('admin-job-titles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/job-titles')
export class AdminJobTitleController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @ApiOperation({
    summary: '[Admin] List job titles — paginated, incl. user-typed',
    description: listDescription('job title', 'job titles'),
  })
  @ApiResponse(
    listExample([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Backend Developer',
        type: 'master-typed',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'backend dev',
        type: 'user-typed',
        isActive: true,
        createdAt: '2026-09-18T08:30:00.000Z',
        updatedAt: '2026-09-18T08:30:00.000Z',
      },
    ]),
  )
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async list(@Query() dto: ListMasterDataDto) {
    const data = await this.masterDataService.list('job-titles', dto);
    return { message: 'Job titles fetched successfully', data };
  }

  @Patch(':id')
  @ApiOperation({
    summary: '[Admin] Update a job title (rename / promote / reactivate)',
    description: patchDescription('job title'),
  })
  @ApiParam({ name: 'id', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @ApiResponse(
    rowExample('Job title updated successfully', {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      name: 'Backend Developer II',
      type: 'master-typed',
      isActive: true,
      createdAt: '2026-09-18T08:30:00.000Z',
      updatedAt: '2026-10-05T11:00:00.000Z',
    }),
  )
  @ApiResponse({ status: 404, description: 'Job title not found' })
  @ApiResponse({ status: 409, description: 'Another job title already uses that name' })
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async update(@Param('id') id: string, @Body() dto: UpdateMasterDataDto) {
    const data = await this.masterDataService.update('job-titles', id, dto);
    return { message: 'Job title updated successfully', data };
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Admin] Deactivate a job title (soft delete)',
    description: deleteDescription('job title'),
  })
  @ApiParam({ name: 'id', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @ApiResponse(
    rowExample('Job title deactivated successfully', {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      name: 'backend dev',
      type: 'user-typed',
      isActive: false,
      createdAt: '2026-09-18T08:30:00.000Z',
      updatedAt: '2026-10-05T11:05:00.000Z',
    }),
  )
  @ApiResponse({ status: 404, description: 'Job title not found' })
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async remove(@Param('id') id: string) {
    const data = await this.masterDataService.softDelete('job-titles', id);
    return { message: 'Job title deactivated successfully', data };
  }
}

// ============================================================================
// Qualifications
// ============================================================================

@ApiTags('admin-qualifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/qualifications')
export class AdminQualificationController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @ApiOperation({
    summary: '[Admin] List qualifications — paginated, incl. user-typed',
    description: listDescription('qualification', 'qualifications'),
  })
  @ApiResponse(
    listExample([
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'B.Tech in Computer Science',
        type: 'master-typed',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        name: 'btech cse',
        type: 'user-typed',
        isActive: true,
        createdAt: '2026-09-20T09:00:00.000Z',
        updatedAt: '2026-09-20T09:00:00.000Z',
      },
    ]),
  )
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async list(@Query() dto: ListMasterDataDto) {
    const data = await this.masterDataService.list('qualifications', dto);
    return { message: 'Qualifications fetched successfully', data };
  }

  @Patch(':id')
  @ApiOperation({
    summary: '[Admin] Update a qualification (rename / promote / reactivate)',
    description: patchDescription('qualification'),
  })
  @ApiParam({ name: 'id', example: 'd4e5f6a7-b8c9-0123-defa-234567890123' })
  @ApiResponse(
    rowExample('Qualification updated successfully', {
      id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
      name: 'B.Tech in Computer Science',
      type: 'master-typed',
      isActive: true,
      createdAt: '2026-09-20T09:00:00.000Z',
      updatedAt: '2026-10-05T11:00:00.000Z',
    }),
  )
  @ApiResponse({ status: 404, description: 'Qualification not found' })
  @ApiResponse({ status: 409, description: 'Another qualification already uses that name' })
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async update(@Param('id') id: string, @Body() dto: UpdateMasterDataDto) {
    const data = await this.masterDataService.update('qualifications', id, dto);
    return { message: 'Qualification updated successfully', data };
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Admin] Deactivate a qualification (soft delete)',
    description: deleteDescription('qualification'),
  })
  @ApiParam({ name: 'id', example: 'd4e5f6a7-b8c9-0123-defa-234567890123' })
  @ApiResponse(
    rowExample('Qualification deactivated successfully', {
      id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
      name: '34',
      type: 'user-typed',
      isActive: false,
      createdAt: '2026-09-20T09:00:00.000Z',
      updatedAt: '2026-10-05T11:05:00.000Z',
    }),
  )
  @ApiResponse({ status: 404, description: 'Qualification not found' })
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async remove(@Param('id') id: string) {
    const data = await this.masterDataService.softDelete('qualifications', id);
    return { message: 'Qualification deactivated successfully', data };
  }
}

// ============================================================================
// Certifications
// ============================================================================

@ApiTags('admin-certifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/certifications')
export class AdminCertificationController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @ApiOperation({
    summary: '[Admin] List certifications — paginated, incl. user-typed',
    description: listDescription('certification', 'certifications'),
  })
  @ApiResponse(
    listExample([
      {
        id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
        name: 'AWS Certified Solutions Architect',
        type: 'master-typed',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
        name: 'aws saa',
        type: 'user-typed',
        isActive: true,
        createdAt: '2026-09-22T10:15:00.000Z',
        updatedAt: '2026-09-22T10:15:00.000Z',
      },
    ]),
  )
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async list(@Query() dto: ListMasterDataDto) {
    const data = await this.masterDataService.list('certifications', dto);
    return { message: 'Certifications fetched successfully', data };
  }

  @Patch(':id')
  @ApiOperation({
    summary: '[Admin] Update a certification (rename / promote / reactivate)',
    description: patchDescription('certification'),
  })
  @ApiParam({ name: 'id', example: 'f6a7b8c9-d0e1-2345-fabc-456789012345' })
  @ApiResponse(
    rowExample('Certification updated successfully', {
      id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
      name: 'AWS Certified Solutions Architect – Associate',
      type: 'master-typed',
      isActive: true,
      createdAt: '2026-09-22T10:15:00.000Z',
      updatedAt: '2026-10-05T11:00:00.000Z',
    }),
  )
  @ApiResponse({ status: 404, description: 'Certification not found' })
  @ApiResponse({ status: 409, description: 'Another certification already uses that name' })
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async update(@Param('id') id: string, @Body() dto: UpdateMasterDataDto) {
    const data = await this.masterDataService.update('certifications', id, dto);
    return { message: 'Certification updated successfully', data };
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Admin] Deactivate a certification (soft delete)',
    description: deleteDescription('certification'),
  })
  @ApiParam({ name: 'id', example: 'f6a7b8c9-d0e1-2345-fabc-456789012345' })
  @ApiResponse(
    rowExample('Certification deactivated successfully', {
      id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
      name: 'aws saa',
      type: 'user-typed',
      isActive: false,
      createdAt: '2026-09-22T10:15:00.000Z',
      updatedAt: '2026-10-05T11:05:00.000Z',
    }),
  )
  @ApiResponse({ status: 404, description: 'Certification not found' })
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async remove(@Param('id') id: string) {
    const data = await this.masterDataService.softDelete('certifications', id);
    return { message: 'Certification deactivated successfully', data };
  }
}

// ============================================================================
// Cross-resource counts for the nav badge
// ============================================================================

@ApiTags('admin-master-data')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/master-data')
export class AdminMasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('pending-counts')
  @ApiOperation({
    summary: '[Admin] Count of values awaiting review, per resource',
    description: `
Active \`user-typed\` rows in each of the three master tables — the number the
admin nav badges so nobody has to open three screens to find out there is
nothing to do.

Deactivated rows are not counted: they have already been dealt with.

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiResponse(
    rowExample('Pending master-data counts fetched successfully', {
      jobTitles: 12,
      qualifications: 7,
      certifications: 3,
    }),
  )
  @ApiResponse(AUTH_RESPONSES[0])
  @ApiResponse(AUTH_RESPONSES[1])
  async pendingCounts() {
    const data = await this.masterDataService.pendingCounts();
    return { message: 'Pending master-data counts fetched successfully', data };
  }
}
