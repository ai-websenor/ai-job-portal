import { Controller, Get, Put, Delete, Post, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard, RequirePermissions } from '@ai-job-portal/common';
import { UserManagementService } from './user-management.service';
import { ListUsersDto, UpdateUserStatusDto, UpdateUserRoleDto, BulkActionDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/users')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  @RequirePermissions('VIEW_USERS')
  @ApiOperation({ summary: 'List all users with filters' })
  async listUsers(@Query() dto: ListUsersDto) {
    return this.userManagementService.listUsers(dto);
  }

  @Get('stats')
  @RequirePermissions('VIEW_USERS')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    return this.userManagementService.getUserStats();
  }

  @Get(':id')
  @RequirePermissions('VIEW_USERS')
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id') id: string) {
    return this.userManagementService.getUser(id);
  }

  @Put(':id/status')
  @RequirePermissions('UPDATE_USERS')
  @ApiOperation({ summary: 'Update user status (suspend/activate)' })
  async updateUserStatus(
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userManagementService.updateUserStatus(adminId, id, dto);
  }

  @Put(':id/role')
  @RequirePermissions('MANAGE_ROLES', 'ASSIGN_ROLES')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.userManagementService.updateUserRole(adminId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('DELETE_USERS')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async deleteUser(
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return this.userManagementService.deleteUser(adminId, id, reason);
  }

  @Post('bulk')
  @RequirePermissions('MANAGE_USERS')
  @ApiOperation({ summary: 'Bulk user action' })
  async bulkAction(@Headers('x-user-id') adminId: string, @Body() dto: BulkActionDto) {
    return this.userManagementService.bulkAction(adminId, dto);
  }
}
