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
import {
  RolesGuard,
  Roles,
  CurrentUser,
  CurrentCompany,
  CompanyScoped,
  CompanyScopeGuard,
} from '@ai-job-portal/common';
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
@UseGuards(AuthGuard('jwt'), RolesGuard, CompanyScopeGuard)
@Roles('admin', 'super_admin')
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
  @CompanyScoped() // Admin can only create employers for their assigned company
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employer (Admin only)' })
  @ApiResponse({ status: 201, type: CreateEmployerResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or passwords do not match' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async createEmployer(
    @CurrentUser('sub') adminId: string,
    @CurrentCompany() companyId: string,
    @Body() dto: CreateEmployerDto,
  ): Promise<CreateEmployerResponseDto> {
    console.log(
      `🔍 Controller received - adminId: ${adminId}, companyId: ${companyId}, type: ${typeof companyId}`,
    );
    return this.employerManagementService.createEmployer(adminId || 'system', companyId, dto);
  }

  /**
   * GET /api/v1/admin/employers
   * List all employers with pagination and filtering
   */
  @Get()
  @CompanyScoped() // Admin can only see employers from their assigned company
  @ApiOperation({ summary: 'List all employers with pagination (Admin only)' })
  @ApiResponse({ status: 200, type: PaginatedEmployersResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async listEmployers(
    @CurrentCompany() companyId: string,
    @Query() dto: ListEmployersDto,
  ): Promise<PaginatedEmployersResponseDto> {
    return this.employerManagementService.listEmployers(companyId, dto);
  }

  /**
   * GET /api/v1/admin/employers/:id
   * Get employer details by ID
   */
  @Get(':id')
  @CompanyScoped() // Admin can only view employers from their assigned company
  @ApiOperation({ summary: 'Get employer details by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Employer ID or User ID' })
  @ApiResponse({ status: 200, type: EmployerResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async getEmployer(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ): Promise<{ message: string; data: EmployerResponseDto }> {
    return this.employerManagementService.getEmployer(companyId, id);
  }

  /**
   * PUT /api/v1/admin/employers/:id
   * Update employer details (Admin action)
   */
  @Put(':id')
  @CompanyScoped() // Admin can only update employers from their assigned company
  @ApiOperation({ summary: 'Update employer details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Employer ID or User ID' })
  @ApiResponse({ status: 200, type: EmployerResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateEmployer(
    @CurrentUser('sub') adminId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployerDto,
  ): Promise<{ message: string; data: EmployerResponseDto }> {
    return this.employerManagementService.updateEmployer(adminId || 'system', companyId, id, dto);
  }

  /**
   * DELETE /api/v1/admin/employers/:id
   * Delete/deactivate employer (Admin action)
   * - Soft delete: deactivates user
   * - Invalidates all sessions
   * - Preserves historical data
   */
  @Delete(':id')
  @CompanyScoped() // Admin can only delete employers from their assigned company
  @ApiOperation({ summary: 'Deactivate employer (Admin only)' })
  @ApiParam({ name: 'id', description: 'Employer ID or User ID' })
  @ApiResponse({ status: 200, description: 'Employer deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Employer not found' })
  async deleteEmployer(
    @CurrentUser('sub') adminId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<{ message: string; data: { employerId: string; userId: string } }> {
    return this.employerManagementService.deleteEmployer(
      adminId || 'system',
      companyId,
      id,
      reason,
    );
  }
}
