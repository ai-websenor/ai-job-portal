'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InvalidateCache =
  exports.NoCache =
  exports.Cache =
  exports.CACHE_TTL_KEY =
  exports.CACHE_KEY =
    void 0;
const common_1 = require('@nestjs/common');
exports.CACHE_KEY = 'cache';
exports.CACHE_TTL_KEY = 'cacheTTL';
const Cache = (options) => (0, common_1.SetMetadata)(exports.CACHE_KEY, options || {});
exports.Cache = Cache;
const NoCache = () => (0, common_1.SetMetadata)(exports.CACHE_KEY, { disabled: true });
exports.NoCache = NoCache;
const InvalidateCache = (...keys) => (0, common_1.SetMetadata)('invalidateCache', keys);
exports.InvalidateCache = InvalidateCache;
//# sourceMappingURL=cache.decorator.js.map
