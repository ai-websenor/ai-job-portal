/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Public, Roles, RolesGuard } from '@ai-job-portal/common';
import { EducationService } from './education.service';
import {
  CreateDegreeDto,
  UpdateDegreeDto,
  CreateFieldOfStudyDto,
  UpdateFieldOfStudyDto,
  DegreeQueryDto,
  FieldOfStudyQueryDto,
  EducationLevel,
} from './dto';

// ── Swagger example schemas ──────────────────────────────────────────────────

class DegreeSchema {
  @ApiProperty({ example: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be' }) id: string;
  @ApiProperty({ example: 'Bachelor of Technology (B.Tech)' }) name: string;
  @ApiProperty({ example: 'bachelors', enum: EducationLevel }) level: string;
  @ApiProperty({ example: true }) isActive: boolean;
  @ApiProperty({ example: '2026-02-19T09:03:32.688Z' }) createdAt: string;
  @ApiProperty({ example: '2026-02-19T09:03:32.688Z' }) updatedAt: string;
}

class FieldOfStudySchema {
  @ApiProperty({ example: 'a2bc3d4e-5678-90ab-cdef-112233445566' }) id: string;
  @ApiProperty({ example: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be' }) degreeId: string;
  @ApiProperty({ example: 'Computer Science & Engineering' }) name: string;
  @ApiProperty({ example: true }) isActive: boolean;
  @ApiProperty({ example: '2026-02-19T09:03:32.688Z' }) createdAt: string;
  @ApiProperty({ example: '2026-02-19T09:03:32.688Z' }) updatedAt: string;
}

class PaginationMetaSchema {
  @ApiProperty({ example: 100 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 15 }) limit: number;
  @ApiProperty({ example: 7 }) totalPages: number;
}

// ── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Education')
@Controller()
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (candidate onboarding — no authentication required)
  // ==========================================================================

  @Get('degrees')
  @Public()
  @ApiOperation({
    summary: 'List all active degrees',
    description: `
Returns all active degree programs for use in candidate onboarding dropdowns.
Results are ordered by level then name.

**Use cases:**
- Populate the "Degree" dropdown when a candidate adds education
- Filter by education level (e.g., show only bachelor's programs)
- Search by degree name

**No authentication required.**
    `.trim(),
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Bachelor',
    description: 'Filter degrees by name (case-insensitive)',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: EducationLevel,
    description: 'Filter by education level',
    example: 'bachelors',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active degrees',
    schema: {
      example: {
        data: [
          {
            id: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
            name: 'Bachelor of Technology (B.Tech)',
            level: 'bachelors',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
          {
            id: '95711d1b-c09e-4234-8f57-29813009c523',
            name: 'Bachelor of Business Administration (BBA)',
            level: 'bachelors',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
        ],
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  getPublicDegrees(@Query('search') search?: string, @Query('level') level?: string) {
    return this.educationService.getPublicDegrees(search, level);
  }

  @Get('degrees/:degreeId/fields-of-study')
  @Public()
  @ApiOperation({
    summary: 'List fields of study for a degree',
    description: `
Returns all active fields of study belonging to a specific degree.
Call this **after** the user selects a degree to populate the "Field of Study" dropdown.

**Workflow:**
1. User selects a degree → call \`GET /degrees\`
2. User selects a field → call \`GET /degrees/:degreeId/fields-of-study\`

**No authentication required.**
    `.trim(),
  })
  @ApiParam({
    name: 'degreeId',
    description: 'UUID of the degree',
    example: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Computer',
    description: 'Filter fields by name (case-insensitive)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active fields of study for the selected degree',
    schema: {
      example: {
        data: [
          {
            id: 'a2bc3d4e-5678-90ab-cdef-112233445566',
            degreeId: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
            name: 'Computer Science & Engineering',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
          {
            id: 'b3cd4e5f-6789-01bc-def0-223344556677',
            degreeId: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
            name: 'Data Science & Artificial Intelligence',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
        ],
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Degree not found or inactive',
    schema: { example: { statusCode: 404, message: 'Degree not found', error: 'Not Found' } },
  })
  getPublicFieldsOfStudy(@Param('degreeId') degreeId: string, @Query('search') search?: string) {
    return this.educationService.getPublicFieldsOfStudy(degreeId, search);
  }

  // ==========================================================================
  // ADMIN ENDPOINTS — Degrees
  // Requires: Bearer token with role admin or super_admin
  // ==========================================================================

  @Get('master-data/degrees')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] List all degrees — paginated',
    description: `
Returns a paginated list of **all** active degree programs.
Supports filtering by education level and searching by name.

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 15,
    description: 'Items per page (default: 15, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Bachelor',
    description: 'Search by degree name',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: EducationLevel,
    description: 'Filter by education level',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated degree list',
    schema: {
      example: {
        data: [
          {
            id: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
            name: 'Bachelor of Technology (B.Tech)',
            level: 'bachelors',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
          {
            id: '36732ab9-3a68-41bd-9045-a80008de478a',
            name: 'Commerce Stream',
            level: 'high_school',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
        ],
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
        meta: { total: 100, page: 1, limit: 15, totalPages: 7 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  getAllDegrees(@Query() query: DegreeQueryDto) {
    return this.educationService.getAllDegrees(query);
  }

  @Post('master-data/degrees')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Create a degree',
    description: `
Creates a new master degree program.

**Required role:** \`admin\` or \`super_admin\`

**Education levels:**
| Value | Description |
|---|---|
| \`high_school\` | High School / Secondary |
| \`diploma\` | Diploma / Polytechnic |
| \`certificate\` | Short-term Certificate |
| \`bachelors\` | Bachelor's Degree |
| \`masters\` | Master's Degree |
| \`phd\` | Doctorate / PhD |
    `.trim(),
  })
  @ApiBody({
    description: 'Degree creation payload',
    schema: {
      required: ['name', 'level'],
      properties: {
        name: {
          type: 'string',
          example: 'Bachelor of Technology (B.Tech)',
          description: 'Full degree name',
        },
        level: {
          type: 'string',
          enum: Object.values(EducationLevel),
          example: 'bachelors',
          description: 'Education level category',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Degree created successfully',
    schema: {
      example: {
        message: 'Degree created successfully',
        data: {
          id: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
          name: 'Bachelor of Technology (B.Tech)',
          level: 'bachelors',
          isActive: true,
          createdAt: '2026-02-19T09:03:32.688Z',
          updatedAt: '2026-02-19T09:03:32.688Z',
        },
        status: 'success',
        statusCode: 201,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error — invalid level value or missing fields',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createDegree(@Body() dto: CreateDegreeDto) {
    const degree = await this.educationService.createDegree(dto);
    return { message: 'Degree created successfully', data: degree };
  }

  @Put('master-data/degrees/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Update a degree',
    description: `
Updates the name and/or education level of an existing degree.
All fields are optional — only send what needs to change.

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the degree to update',
    example: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
  })
  @ApiBody({
    description: 'Fields to update (all optional)',
    schema: {
      properties: {
        name: { type: 'string', example: 'B.Tech (Updated Name)', description: 'New degree name' },
        level: {
          type: 'string',
          enum: Object.values(EducationLevel),
          example: 'masters',
          description: 'New education level',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Degree updated successfully',
    schema: {
      example: {
        message: 'Degree updated successfully',
        data: {
          id: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
          name: 'B.Tech (Updated Name)',
          level: 'masters',
          isActive: true,
          createdAt: '2026-02-19T09:03:32.688Z',
          updatedAt: '2026-02-19T10:15:00.000Z',
        },
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Degree not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateDegree(@Param('id') id: string, @Body() dto: UpdateDegreeDto) {
    const degree = await this.educationService.updateDegree(id, dto);
    return { message: 'Degree updated successfully', data: degree };
  }

  @Delete('master-data/degrees/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Delete a degree',
    description: `
Deletes a degree from the master list.

**Smart delete logic:**
- If the degree has **no linked fields of study** → **hard delete** (permanent removal)
- If the degree has **linked fields of study** → **soft delete** (sets \`isActive: false\`, degree is hidden from candidates but data is preserved)

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the degree to delete',
    example: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
  })
  @ApiResponse({
    status: 200,
    description: 'Hard delete (no linked fields of study)',
    schema: {
      example: {
        data: { success: true, softDeleted: false },
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Soft delete (degree has linked fields of study)',
    schema: {
      example: {
        data: {
          success: true,
          softDeleted: true,
          message: 'Degree has 10 field(s) of study. It has been deactivated instead of deleted.',
        },
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Degree not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteDegree(@Param('id') id: string) {
    return this.educationService.deleteDegree(id);
  }

  // ==========================================================================
  // ADMIN ENDPOINTS — Fields of Study
  // ==========================================================================

  @Get('master-data/degrees/:degreeId/fields-of-study')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] List fields of study for a degree — paginated',
    description: `
Returns a paginated list of active fields of study under a specific degree.
Use the \`search\` param to filter by name.

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'degreeId',
    description: 'UUID of the parent degree',
    example: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 15,
    description: 'Items per page (default: 15, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Computer',
    description: 'Search by field name',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated fields of study',
    schema: {
      example: {
        data: [
          {
            id: 'a2bc3d4e-5678-90ab-cdef-112233445566',
            degreeId: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
            name: 'Computer Science & Engineering',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
          {
            id: 'b3cd4e5f-6789-01bc-def0-223344556677',
            degreeId: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
            name: 'Data Science & Artificial Intelligence',
            isActive: true,
            createdAt: '2026-02-19T09:03:32.688Z',
            updatedAt: '2026-02-19T09:03:32.688Z',
          },
        ],
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
        meta: { total: 10, page: 1, limit: 15, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Degree not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getFieldsOfStudy(@Param('degreeId') degreeId: string, @Query() query: FieldOfStudyQueryDto) {
    return this.educationService.getFieldsOfStudy(degreeId, query);
  }

  @Post('master-data/degrees/:degreeId/fields-of-study')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Add a field of study to a degree',
    description: `
Creates a new field of study under a specific degree.

**Example:** Adding "Mechanical Engineering" under "Bachelor of Technology (B.Tech)"

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'degreeId',
    description: 'UUID of the parent degree',
    example: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
  })
  @ApiBody({
    description: 'Field of study creation payload',
    schema: {
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          example: 'Mechanical Engineering',
          description: 'Field of study name',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Field of study created successfully',
    schema: {
      example: {
        message: 'Field of study created successfully',
        data: {
          id: 'a2bc3d4e-5678-90ab-cdef-112233445566',
          degreeId: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
          name: 'Mechanical Engineering',
          isActive: true,
          createdAt: '2026-02-19T09:03:32.688Z',
          updatedAt: '2026-02-19T09:03:32.688Z',
        },
        status: 'success',
        statusCode: 201,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error — name is required' })
  @ApiResponse({ status: 404, description: 'Parent degree not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createFieldOfStudy(
    @Param('degreeId') degreeId: string,
    @Body() dto: CreateFieldOfStudyDto,
  ) {
    const field = await this.educationService.createFieldOfStudy(degreeId, dto);
    return { message: 'Field of study created successfully', data: field };
  }

  @Put('master-data/fields-of-study/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Update a field of study',
    description: `
Updates the name of an existing field of study.

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the field of study to update',
    example: 'a2bc3d4e-5678-90ab-cdef-112233445566',
  })
  @ApiBody({
    description: 'Update payload',
    schema: {
      properties: {
        name: {
          type: 'string',
          example: 'Mechanical Engineering (Updated)',
          description: 'New name for the field of study',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Field of study updated',
    schema: {
      example: {
        message: 'Field of study updated successfully',
        data: {
          id: 'a2bc3d4e-5678-90ab-cdef-112233445566',
          degreeId: 'f5ca3e8b-b131-4d18-91d5-b37c3828e2be',
          name: 'Mechanical Engineering (Updated)',
          isActive: true,
          createdAt: '2026-02-19T09:03:32.688Z',
          updatedAt: '2026-02-19T10:30:00.000Z',
        },
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Field of study not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateFieldOfStudy(@Param('id') id: string, @Body() dto: UpdateFieldOfStudyDto) {
    const field = await this.educationService.updateFieldOfStudy(id, dto);
    return { message: 'Field of study updated successfully', data: field };
  }

  @Delete('master-data/fields-of-study/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: '[Admin] Delete a field of study',
    description: `
Permanently deletes a field of study. This is a **hard delete** (no soft-delete for fields).

**Required role:** \`admin\` or \`super_admin\`
    `.trim(),
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the field of study to delete',
    example: 'a2bc3d4e-5678-90ab-cdef-112233445566',
  })
  @ApiResponse({
    status: 200,
    description: 'Field of study deleted',
    schema: {
      example: {
        data: { success: true },
        message: 'Operation successful',
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Field of study not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteFieldOfStudy(@Param('id') id: string) {
    return this.educationService.deleteFieldOfStudy(id);
  }
}
