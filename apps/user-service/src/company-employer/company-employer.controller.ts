import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
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
import {
  RolesGuard,
  Roles,
  CurrentUser,
  CurrentCompany,
  CompanyScoped,
  CompanyScopeGuard,
} from '@ai-job-portal/common';
import { CompanyEmployerService } from './company-employer.service';
import {
  CreateCompanyEmployerDto,
  ListCompanyEmployersDto,
  UpdateCompanyEmployerDto,
  UpdatePermissionsDto,
  CompanyEmployerResponseDto,
  CreateCompanyEmployerResponseDto,
  PaginatedCompanyEmployersResponseDto,
  EmployerPermissionsResponseDto,
} from './dto';

@ApiTags('company-employer')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, CompanyScopeGuard)
@Roles('super_employer')
@Controller('company-employers')
export class CompanyEmployerController {
  constructor(private readonly companyEmployerService: CompanyEmployerService) {}

  /**
   * POST /api/v1/company-employers
   * Create a new employer under super_employer's company
   */
  @Post()
  @CompanyScoped()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a new employer to your company',
    description: `Creates a new employer account under the super_employer's company.

**Who can use this:** Only users with \`super_employer\` role.

**What happens:**
1. Validates the input (email uniqueness, password match, etc.)
2. Creates the employer account in Cognito (authentication provider)
3. Auto-confirms the account (no email verification needed)
4. Creates the user record and employer profile in the database
5. Auto-assigns the employer to your company

**Note:** The newly created employer can immediately log in with their email and password. They do NOT need to verify their email.`,
  })
  @ApiBody({
    type: CreateCompanyEmployerDto,
    description: 'Employer details to create',
    examples: {
      'HR Manager': {
        summary: 'Create an HR Manager',
        description: 'Add a new employer with HR Manager designation',
        value: {
          firstName: 'Rahul',
          lastName: 'Sharma',
          email: 'rahul.sharma@techcorp.com',
          password: 'SecureP@ss123',
          confirmPassword: 'SecureP@ss123',
          mobile: '+919876543210',
          designation: 'HR Manager',
          department: 'Human Resources',
        },
      },
      'Engineering Lead': {
        summary: 'Create an Engineering Lead',
        description: 'Add a new employer with minimal fields (no designation/department)',
        value: {
          firstName: 'Priya',
          lastName: 'Patel',
          email: 'priya.patel@techcorp.com',
          password: 'Str0ngP@ssw0rd!',
          confirmPassword: 'Str0ngP@ssw0rd!',
          mobile: '+918765432109',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    type: CreateCompanyEmployerResponseDto,
    description: 'Employer created successfully',
    schema: {
      example: {
        data: {
          userId: '660e8400-e29b-41d4-a716-446655440000',
          employerId: '550e8400-e29b-41d4-a716-446655440001',
        },
        message: 'Employer created successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or passwords do not match',
    schema: {
      example: {
        statusCode: 400,
        message: 'Passwords do not match',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid Bearer token required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - super_employer role required or no company assigned',
    schema: {
      example: {
        statusCode: 403,
        message: 'Super employer does not have a company assigned. Contact super admin.',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email already registered',
        error: 'Conflict',
      },
    },
  })
  async createEmployer(
    @CurrentUser('sub') superEmployerId: string,
    @CurrentCompany() companyId: string,
    @Body() dto: CreateCompanyEmployerDto,
  ): Promise<CreateCompanyEmployerResponseDto> {
    return this.companyEmployerService.createEmployer(superEmployerId || 'system', companyId, dto);
  }

  /**
   * GET /api/v1/company-employers
   * List all employers in the super_employer's company
   */
  @Get()
  @CompanyScoped()
  @ApiOperation({
    summary: 'List all employers in your company',
    description: `Returns a paginated list of all employers belonging to the super_employer's company.

**Who can use this:** Only users with \`super_employer\` role.

**Supports:**
- Pagination (page, limit)
- Search by email, first name, or last name
- Filter by status (active/inactive)
- Filter by verification status
- Date range filtering
- Sorting by createdAt (asc/desc)`,
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'rahul',
    description: 'Search by email, first name, or last name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive'],
    description: 'Filter by account status',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    example: true,
    description: 'Filter by verification status',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    example: '2025-01-01',
    description: 'Filter from date (ISO 8601)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    example: '2025-12-31',
    description: 'Filter to date (ISO 8601)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    type: PaginatedCompanyEmployersResponseDto,
    description: 'Paginated list of employers',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: '660e8400-e29b-41d4-a716-446655440000',
            firstName: 'Rahul',
            lastName: 'Sharma',
            email: 'rahul.sharma@techcorp.com',
            mobile: '+919876543210',
            isActive: true,
            isVerified: true,
            designation: 'HR Manager',
            department: 'Human Resources',
            company: {
              id: '770e8400-e29b-41d4-a716-446655440000',
              name: 'TechCorp Solutions',
              industry: 'Information Technology',
            },
            createdAt: '2025-06-15T10:30:00.000Z',
            updatedAt: '2025-06-15T10:30:00.000Z',
          },
        ],
        message: 'Employers fetched successfully',
        pagination: {
          totalEmployers: 1,
          pageCount: 1,
          currentPage: 1,
          hasNextPage: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Valid Bearer token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - super_employer role required' })
  async listEmployers(
    @CurrentUser('sub') superEmployerId: string,
    @CurrentCompany() companyId: string,
    @Query() dto: ListCompanyEmployersDto,
  ): Promise<PaginatedCompanyEmployersResponseDto> {
    return this.companyEmployerService.listEmployers(superEmployerId || 'system', companyId, dto);
  }

  /**
   * GET /api/v1/company-employers/:id
   * Get employer details by ID
   */
  @Get(':id')
  @CompanyScoped()
  @ApiOperation({
    summary: 'Get employer details by ID',
    description: `Returns detailed information about a specific employer in your company.

**Who can use this:** Only users with \`super_employer\` role.

**Accepts:** Either the employer profile ID or the user account ID as the \`id\` parameter.

**Company-scoped:** You can only view employers that belong to your company.`,
  })
  @ApiParam({
    name: 'id',
    description: 'Employer profile ID or User account ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Employer details retrieved successfully',
    schema: {
      example: {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: '660e8400-e29b-41d4-a716-446655440000',
          firstName: 'Rahul',
          lastName: 'Sharma',
          email: 'rahul.sharma@techcorp.com',
          mobile: '+919876543210',
          isActive: true,
          isVerified: true,
          designation: 'HR Manager',
          department: 'Human Resources',
          company: {
            id: '770e8400-e29b-41d4-a716-446655440000',
            name: 'TechCorp Solutions',
            industry: 'Information Technology',
          },
          createdAt: '2025-06-15T10:30:00.000Z',
          updatedAt: '2025-06-15T10:30:00.000Z',
        },
        message: 'Employer fetched successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Valid Bearer token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Employer does not belong to your company' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async getEmployer(
    @CurrentUser('sub') superEmployerId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ): Promise<{ message: string; data: CompanyEmployerResponseDto }> {
    return this.companyEmployerService.getEmployer(superEmployerId || 'system', companyId, id);
  }

  /**
   * PUT /api/v1/company-employers/:id
   * Update employer details
   */
  @Put(':id')
  @CompanyScoped()
  @ApiOperation({
    summary: 'Update employer details',
    description: `Updates an employer's profile and account information.

**Who can use this:** Only users with \`super_employer\` role.

**Company-scoped:** You can only update employers that belong to your company.

**Supports partial updates:** Only provided fields will be updated. Omitted fields remain unchanged.

**Updatable fields:**
- \`firstName\` - First name
- \`lastName\` - Last name
- \`email\` - Email address (must be unique)
- \`mobile\` - Mobile number
- \`designation\` - Job designation/title
- \`department\` - Department
- \`isActive\` - Activate/deactivate account
- \`isVerified\` - Set verification status`,
  })
  @ApiParam({
    name: 'id',
    description: 'Employer profile ID or User account ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateCompanyEmployerDto,
    description: 'Fields to update (partial update supported)',
    examples: {
      'Update designation': {
        summary: 'Update designation and department',
        value: {
          designation: 'Senior HR Manager',
          department: 'Human Resources',
        },
      },
      'Deactivate employer': {
        summary: 'Deactivate an employer account',
        value: {
          isActive: false,
        },
      },
      'Full update': {
        summary: 'Update multiple fields',
        value: {
          firstName: 'Rahul',
          lastName: 'Kumar',
          designation: 'Head of HR',
          department: 'People & Culture',
          isVerified: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Employer updated successfully',
    schema: {
      example: {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: '660e8400-e29b-41d4-a716-446655440000',
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'rahul.sharma@techcorp.com',
          mobile: '+919876543210',
          isActive: true,
          isVerified: true,
          designation: 'Head of HR',
          department: 'People & Culture',
          company: {
            id: '770e8400-e29b-41d4-a716-446655440000',
            name: 'TechCorp Solutions',
            industry: 'Information Technology',
          },
          createdAt: '2025-06-15T10:30:00.000Z',
          updatedAt: '2025-06-20T14:00:00.000Z',
        },
        message: 'Employer updated successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Valid Bearer token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Employer does not belong to your company' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  @ApiResponse({ status: 409, description: 'Email already in use by another account' })
  async updateEmployer(
    @CurrentUser('sub') superEmployerId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyEmployerDto,
  ): Promise<{ message: string; data: CompanyEmployerResponseDto }> {
    return this.companyEmployerService.updateEmployer(
      superEmployerId || 'system',
      companyId,
      id,
      dto,
    );
  }

  // ============================================
  // PERMISSIONS ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/company-employers/permissions
   * List all employer-assignable permissions
   */
  @Get('permissions')
  @CompanyScoped()
  @ApiOperation({
    summary: 'List all employer-assignable permissions',
    description: `Returns all permissions that can be assigned to employers.

**Who can use this:** Only users with \`super_employer\` role.

**Includes permissions for:**
- **Jobs** - create, read, update, delete, list, publish, unpublish, moderate
- **Applications** - create, read, update, delete, list, review
- **Interviews** - create, read, update, delete
- **Candidates** - read
- **Companies** - read, write

Use these permission IDs when updating permissions via PATCH /company-employers/:id/permissions.`,
  })
  @ApiResponse({
    status: 200,
    type: EmployerPermissionsResponseDto,
    description: 'All employer-assignable permissions with isEnabled=true by default',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'jobs:create',
            description: 'Create job postings',
            resource: 'jobs',
            action: 'create',
            isEnabled: true,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'applications:read',
            description: 'View application details',
            resource: 'applications',
            action: 'read',
            isEnabled: true,
          },
        ],
        message: 'Employer permissions fetched successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Valid Bearer token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - super_employer role required' })
  async listPermissions(): Promise<EmployerPermissionsResponseDto> {
    return this.companyEmployerService.listEmployerPermissions();
  }

  /**
   * GET /api/v1/company-employers/:id/permissions
   * Get an employer's currently assigned permissions
   */
  @Get(':id/permissions')
  @CompanyScoped()
  @ApiOperation({
    summary: "Get an employer's assigned permissions",
    description: `Returns all employer-assignable permissions with their current enabled/disabled state for a specific employer.

**Who can use this:** Only users with \`super_employer\` role.

**Response:** Each permission includes an \`isEnabled\` flag indicating whether the employer currently has that permission.

**Company-scoped:** You can only view permissions for employers in your company.`,
  })
  @ApiParam({
    name: 'id',
    description: 'Employer profile ID or User account ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    type: EmployerPermissionsResponseDto,
    description: "Employer's current permissions with enabled state",
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'jobs:create',
            description: 'Create job postings',
            resource: 'jobs',
            action: 'create',
            isEnabled: true,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'jobs:delete',
            description: 'Delete job postings',
            resource: 'jobs',
            action: 'delete',
            isEnabled: false,
          },
        ],
        message: 'Employer permissions fetched successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Employer not in your company' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async getEmployerPermissions(
    @CurrentUser('sub') superEmployerId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ): Promise<EmployerPermissionsResponseDto> {
    return this.companyEmployerService.getEmployerPermissions(
      superEmployerId || 'system',
      companyId,
      id,
    );
  }

  /**
   * PATCH /api/v1/company-employers/:id/permissions
   * Assign / Update permissions for an employer
   */
  @Patch(':id/permissions')
  @CompanyScoped()
  @ApiOperation({
    summary: 'Assign / Update permissions for an employer',
    description: `Update permissions for a specific employer. Send each permission with its enabled/disabled state.

**Who can use this:** Only users with \`super_employer\` role.

**How it works:**
- Send an array of \`{ permissionId, isEnabled }\` objects
- \`isEnabled: true\` = permission granted (checkbox checked)
- \`isEnabled: false\` = permission revoked (checkbox unchecked)
- Only the permissions in the request are updated, all others stay unchanged
- Can send all permissions at once or just the changed ones

**Use cases:**
- **After employer creation:** Send all permissions with checked/unchecked state from the permission form
- **Profile edit:** Send only the permissions that were toggled

**Company-scoped:** You can only update permissions for employers in your company.`,
  })
  @ApiParam({
    name: 'id',
    description: 'Employer profile ID or User account ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdatePermissionsDto,
    description: 'Permission changes to apply',
    examples: {
      'Save all permissions (after creation)': {
        summary: 'Save all permissions from the form',
        description: 'Send all permissions with their checked/unchecked state',
        value: {
          permissions: [
            { permissionId: '550e8400-e29b-41d4-a716-446655440001', isEnabled: true },
            { permissionId: '550e8400-e29b-41d4-a716-446655440002', isEnabled: true },
            { permissionId: '550e8400-e29b-41d4-a716-446655440003', isEnabled: false },
          ],
        },
      },
      'Toggle specific permissions (profile edit)': {
        summary: 'Toggle a few permissions',
        description: 'Only send the permissions that changed',
        value: {
          permissions: [
            { permissionId: '550e8400-e29b-41d4-a716-446655440001', isEnabled: false },
            { permissionId: '550e8400-e29b-41d4-a716-446655440002', isEnabled: true },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: EmployerPermissionsResponseDto,
    description: 'Permissions updated. Returns full updated permission state.',
  })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Employer not in your company' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async updatePermissions(
    @CurrentUser('sub') superEmployerId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ): Promise<EmployerPermissionsResponseDto> {
    return this.companyEmployerService.updatePermissions(
      superEmployerId || 'system',
      companyId,
      id,
      dto,
    );
  }

  /**
   * DELETE /api/v1/company-employers/:id
   * Deactivate employer (soft delete)
   */
  @Delete(':id')
  @CompanyScoped()
  @ApiOperation({
    summary: 'Deactivate an employer (soft delete)',
    description: `Deactivates an employer account. This is a soft delete operation.

**Who can use this:** Only users with \`super_employer\` role.

**Company-scoped:** You can only deactivate employers that belong to your company.

**What happens:**
1. The employer's account is marked as inactive
2. Their email is anonymized (cannot be reused immediately)
3. All active sessions are invalidated (employer is logged out everywhere)
4. Historical data is preserved for audit purposes

**Note:** This action can be reversed by updating the employer's \`isActive\` status back to \`true\` using the update endpoint.`,
  })
  @ApiParam({
    name: 'id',
    description: 'Employer profile ID or User account ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Optional reason for deactivation (for audit trail)',
          example: 'Employee resigned from the company',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Employer deactivated successfully',
    schema: {
      example: {
        data: {
          employerId: '550e8400-e29b-41d4-a716-446655440000',
          userId: '660e8400-e29b-41d4-a716-446655440000',
        },
        message: 'Employer deactivated successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Valid Bearer token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Employer does not belong to your company' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async deleteEmployer(
    @CurrentUser('sub') superEmployerId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<{ message: string; data: { employerId: string; userId: string } }> {
    return this.companyEmployerService.deleteEmployer(
      superEmployerId || 'system',
      companyId,
      id,
      reason,
    );
  }
}
