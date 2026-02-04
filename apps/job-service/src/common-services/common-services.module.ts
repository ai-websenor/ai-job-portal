import { Module, Global } from '@nestjs/common';
import { PermissionService, AuditService } from '@ai-job-portal/common';

/**
 * Global module providing common services from @ai-job-portal/common
 * These services require DATABASE and REDIS_CLIENT which are provided
 * by DatabaseModule and RedisModule respectively (both are @Global)
 */
@Global()
@Module({
  providers: [PermissionService, AuditService],
  exports: [PermissionService, AuditService],
})
export class CommonServicesModule {}
