import { Controller, Get, Put, Delete, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { UserManagementService } from './user-management.service';
import {
  ListUsersDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  BulkActionDto,
  CreateAdminDto,
} from './dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin')
@Controller('admin/users')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Post('admins')
  @ApiOperation({
    summary: 'Create a new admin user with company assignment',
    description:
      'Only SUPER_ADMIN can create admin users. Admin will be scoped to the specified company.',
  })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createAdmin(@CurrentUser('sub') creatorId: string, @Body() dto: CreateAdminDto) {
    const result = await this.userManagementService.createAdmin(creatorId, dto);
    return {
      data: result,
      message: 'Admin created successfully',
      status: 'success',
      statusCode: 201,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all users with filters' })
  async listUsers(@Query() dto: ListUsersDto) {
    return this.userManagementService.listUsers(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    return this.userManagementService.getUserStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id') id: string) {
    return this.userManagementService.getUser(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update user status (suspend/activate)' })
  async updateUserStatus(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userManagementService.updateUserStatus(adminId, id, dto);
  }

  @Put(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.userManagementService.updateUserRole(adminId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async deleteUser(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return this.userManagementService.deleteUser(adminId, id, reason);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk user action' })
  async bulkAction(@CurrentUser('sub') adminId: string, @Body() dto: BulkActionDto) {
    return this.userManagementService.bulkAction(adminId, dto);
  }
}
