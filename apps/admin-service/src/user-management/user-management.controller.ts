import { Controller, Get, Put, Delete, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserManagementService } from './user-management.service';
import { ListUsersDto, UpdateUserStatusDto, UpdateUserRoleDto, BulkActionDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

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
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userManagementService.updateUserStatus(adminId, id, dto);
  }

  @Put(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.userManagementService.updateUserRole(adminId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async deleteUser(
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return this.userManagementService.deleteUser(adminId, id, reason);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk user action' })
  async bulkAction(
    @Headers('x-user-id') adminId: string,
    @Body() dto: BulkActionDto,
  ) {
    return this.userManagementService.bulkAction(adminId, dto);
  }
}
