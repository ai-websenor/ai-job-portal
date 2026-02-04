import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions, CurrentUser } from '@ai-job-portal/common';
import { EmployerManagementService } from './employer-management.service';
import {
  CreateEmployerDto,
  ListEmployersDto,
  UpdateEmployerDto,
  EmployerResponseDto,
  CreateEmployerResponseDto,
  PaginatedEmployersResponseDto,
} from './dto';

@ApiTags('admin-employers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/employers')
export class EmployerManagementController {
  constructor(private readonly employerManagementService: EmployerManagementService) {}

  /**
   * POST /api/v1/admin/employers
   * Create a new employer (Admin action)
   * - No OTP, no email verification
   * - Does NOT auto-login the employer
   */
  @Post()
  @RequirePermissions('CREATE_EMPLOYER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employer (requires CREATE_EMPLOYER permission)' })
  @ApiResponse({ status: 201, type: CreateEmployerResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or passwords do not match' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Required permission: CREATE_EMPLOYER' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async createEmployer(
    @CurrentUser('sub') adminId: string,
    @Body() dto: CreateEmployerDto,
  ): Promise<CreateEmployerResponseDto> {
    return this.employerManagementService.createEmployer(adminId || 'system', dto);
  }

  /**
   * GET /api/v1/admin/employers
   * List all employers with pagination and filtering
   */
  @Get()
  @RequirePermissions('VIEW_USERS')
  @ApiOperation({ summary: 'List all employers with pagination (requires VIEW_USERS permission)' })
  @ApiResponse({ status: 200, type: PaginatedEmployersResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Required permission: VIEW_USERS' })
  async listEmployers(@Query() dto: ListEmployersDto): Promise<PaginatedEmployersResponseDto> {
    return this.employerManagementService.listEmployers(dto);
  }

  /**
   * GET /api/v1/admin/employers/:id
   * Get employer details by ID
   */
  @Get(':id')
  @RequirePermissions('VIEW_USERS')
  @ApiOperation({ summary: 'Get employer details by ID (requires VIEW_USERS permission)' })
  @ApiParam({ name: 'id', description: 'Employer ID or User ID' })
  @ApiResponse({ status: 200, type: EmployerResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Required permission: VIEW_USERS' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async getEmployer(
    @Param('id') id: string,
  ): Promise<{ message: string; data: EmployerResponseDto }> {
    return this.employerManagementService.getEmployer(id);
  }

  /**
   * PUT /api/v1/admin/employers/:id
   * Update employer details (Admin action)
   */
  @Put(':id')
  @RequirePermissions('UPDATE_EMPLOYER')
  @ApiOperation({ summary: 'Update employer details (requires UPDATE_EMPLOYER permission)' })
  @ApiParam({ name: 'id', description: 'Employer ID or User ID' })
  @ApiResponse({ status: 200, type: EmployerResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Required permission: UPDATE_EMPLOYER' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateEmployer(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployerDto,
  ): Promise<{ message: string; data: EmployerResponseDto }> {
    return this.employerManagementService.updateEmployer(adminId || 'system', id, dto);
  }

  /**
   * DELETE /api/v1/admin/employers/:id
   * Delete/deactivate employer (Admin action)
   * - Soft delete: deactivates user
   * - Invalidates all sessions
   * - Preserves historical data
   */
  @Delete(':id')
  @RequirePermissions('DELETE_EMPLOYER')
  @ApiOperation({ summary: 'Deactivate employer (requires DELETE_EMPLOYER permission)' })
  @ApiParam({ name: 'id', description: 'Employer ID or User ID' })
  @ApiResponse({ status: 200, description: 'Employer deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Required permission: DELETE_EMPLOYER' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async deleteEmployer(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<{ message: string; data: { employerId: string; userId: string } }> {
    return this.employerManagementService.deleteEmployer(adminId || 'system', id, reason);
  }
}
