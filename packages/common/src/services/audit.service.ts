import { Injectable, Inject } from '@nestjs/common';
import { Database, auditLogs } from '@ai-job-portal/database';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Service for logging sensitive actions to audit trail
 * Provides compliance and security monitoring
 */
@Injectable()
export class AuditService {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  /**
   * Create an audit log entry
   * @param data - Audit log data
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValue: data.oldValue,
        newValue: data.newValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        status: data.status,
        errorMessage: data.errorMessage,
        metadata: data.metadata,
      });
    } catch (error) {
      // Log to console but don't throw - audit failures shouldn't block operations
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    action: string,
    resource: string,
    userId?: string,
    options?: {
      resourceId?: string;
      oldValue?: any;
      newValue?: any;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId: options?.resourceId,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      status: 'success',
      metadata: options?.metadata,
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    action: string,
    resource: string,
    errorMessage: string,
    userId?: string,
    options?: {
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId: options?.resourceId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      status: 'failure',
      errorMessage,
      metadata: options?.metadata,
    });
  }
}
