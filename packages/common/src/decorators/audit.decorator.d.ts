export declare const AUDIT_LOG_KEY = "auditLog";
export interface AuditLogOptions {
    action: string;
    resourceType?: string;
    includeBody?: boolean;
    includeResponse?: boolean;
}
export declare const AuditLog: (options: AuditLogOptions) => import("node_modules/@nestjs/common").CustomDecorator<string>;
export declare const TrackActivity: (activity: string) => import("node_modules/@nestjs/common").CustomDecorator<string>;
