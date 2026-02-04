import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route
 * Uses OR logic - user needs at least one of the specified permissions
 *
 * @example
 * ```typescript
 * @Post('companies')
 * @UseGuards(AuthGuard('jwt'), PermissionsGuard)
 * @RequirePermissions('CREATE_COMPANY')
 * createCompany(@Body() dto: CreateCompanyDto) {
 *   return this.companyService.create(dto);
 * }
 * ```
 *
 * @example Multiple permissions (OR logic)
 * ```typescript
 * @Put('jobs/:id')
 * @UseGuards(AuthGuard('jwt'), PermissionsGuard)
 * @RequirePermissions('UPDATE_JOB', 'MODERATE_JOB')
 * updateJob(@Param('id') id: string, @Body() dto: UpdateJobDto) {
 *   return this.jobService.update(id, dto);
 * }
 * ```
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
