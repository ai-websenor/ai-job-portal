'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TrackActivity = exports.AuditLog = exports.AUDIT_LOG_KEY = void 0;
const common_1 = require('@nestjs/common');
exports.AUDIT_LOG_KEY = 'auditLog';
const AuditLog = (options) => (0, common_1.SetMetadata)(exports.AUDIT_LOG_KEY, options);
exports.AuditLog = AuditLog;
const TrackActivity = (activity) => (0, common_1.SetMetadata)('trackActivity', activity);
exports.TrackActivity = TrackActivity;
//# sourceMappingURL=audit.decorator.js.map
