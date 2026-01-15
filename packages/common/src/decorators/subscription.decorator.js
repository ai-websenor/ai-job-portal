'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MinSubscription =
  exports.MIN_SUBSCRIPTION_KEY =
  exports.RequireSubscription =
  exports.SUBSCRIPTION_KEY =
    void 0;
const common_1 = require('@nestjs/common');
exports.SUBSCRIPTION_KEY = 'subscription';
const RequireSubscription = (...plans) =>
  (0, common_1.SetMetadata)(exports.SUBSCRIPTION_KEY, plans);
exports.RequireSubscription = RequireSubscription;
exports.MIN_SUBSCRIPTION_KEY = 'minSubscription';
const MinSubscription = (plan) => (0, common_1.SetMetadata)(exports.MIN_SUBSCRIPTION_KEY, plan);
exports.MinSubscription = MinSubscription;
//# sourceMappingURL=subscription.decorator.js.map
