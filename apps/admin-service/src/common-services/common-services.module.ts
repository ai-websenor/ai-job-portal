import { Module, Global } from '@nestjs/common';
import { PermissionService, AuditService, RoleManagementService } from '@ai-job-portal/common';

/**
 * Global module providing common services from @ai-job-portal/common
 * These services require DATABASE and REDIS_CLIENT which are provided
 * by DatabaseModule and RedisModule respectively (both are @Global)
 */
@Global()
@Module({
  providers: [PermissionService, AuditService, RoleManagementService],
  exports: [PermissionService, AuditService, RoleManagementService],
})
export class CommonServicesModule {}
