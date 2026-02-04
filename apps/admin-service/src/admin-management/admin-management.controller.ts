import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions, CurrentUser } from '@ai-job-portal/common';
import { AdminManagementService } from './admin-management.service';
import { CreateAdminDto } from './dto';

@ApiTags('admin-management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/admins')
export class AdminManagementController {
  constructor(private readonly adminManagementService: AdminManagementService) {}

  /**
   * POST /api/v1/admin/admins
   * Create a new admin user
   * - Requires CREATE_ADMIN permission
   * - Creates user, grants ADMIN role
   * - Sends credentials email (production only)
   */
  @Post()
  @RequirePermissions('CREATE_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new admin user (requires CREATE_ADMIN permission)' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or passwords do not match' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Required permission: CREATE_ADMIN' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async createAdmin(
    @CurrentUser('sub') creatorId: string,
    @Body() dto: CreateAdminDto,
  ) {
    return this.adminManagementService.createAdmin(creatorId, dto);
  }
}
