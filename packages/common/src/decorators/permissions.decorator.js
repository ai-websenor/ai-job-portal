"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireTeamRole = exports.TEAM_ROLE_KEY = exports.RequirePermissions = exports.PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
exports.TEAM_ROLE_KEY = 'teamRole';
const RequireTeamRole = (...roles) => (0, common_1.SetMetadata)(exports.TEAM_ROLE_KEY, roles);
exports.RequireTeamRole = RequireTeamRole;
//# sourceMappingURL=permissions.decorator.js.map