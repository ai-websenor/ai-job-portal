import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '@ai-job-portal/common';
import { RbacService } from './rbac.service';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto } from './dto';

@ApiTags('RBAC')
@Controller('rbac')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ==================== ROLES ====================

  @Get('roles')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get all roles with permissions (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all roles' })
  async getAllRoles() {
    return this.rbacService.getAllRoles();
  }

  @Get('roles/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get role by ID with permissions (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Returns role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRoleById(@Param('id') id: string) {
    return this.rbacService.getRoleById(id);
  }

  @Post('roles')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create new role (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Put('roles/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update role (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete role (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  // ==================== PERMISSIONS ====================

  @Get('permissions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({ status: 200, description: 'Returns all permissions' })
  async getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Get('permissions/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get permission by ID (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Returns permission details' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async getPermissionById(@Param('id') id: string) {
    return this.rbacService.getPermissionById(id);
  }

  @Post('permissions')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create new permission (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission name already exists' })
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  // ==================== ROLE PERMISSIONS ====================

  @Put('roles/:id/permissions')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Assign permissions to role (replaces existing) (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 404, description: 'Role or permission not found' })
  async assignPermissionsToRole(
    @Param('id') roleId: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rbacService.assignPermissionsToRolePublic(roleId, permissionIds);
  }
}
