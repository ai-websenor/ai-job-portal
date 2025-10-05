import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogOptions {
  action: string;
  resourceType?: string;
  includeBody?: boolean;
  includeResponse?: boolean;
}

/**
 * Audit Log decorator - Log this action for audit trail
 * @param options - Audit configuration
 * @example @AuditLog({ action: 'job:create', resourceType: 'job', includeBody: true })
 */
export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);

/**
 * Track Activity decorator - Track user activity
 * @param activity - Activity name
 * @example @TrackActivity('job_viewed')
 */
export const TrackActivity = (activity: string) =>
  SetMetadata('trackActivity', activity);
