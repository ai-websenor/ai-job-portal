import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '../constants/enums';

export const SUBSCRIPTION_KEY = 'subscription';

/**
 * Require Subscription decorator - Restrict access to specific subscription plans
 * @param plans - Array of required subscription plans
 * @example @RequireSubscription(SubscriptionPlan.PREMIUM, SubscriptionPlan.ENTERPRISE)
 */
export const RequireSubscription = (...plans: SubscriptionPlan[]) =>
  SetMetadata(SUBSCRIPTION_KEY, plans);

export const MIN_SUBSCRIPTION_KEY = 'minSubscription';

/**
 * Minimum Subscription decorator - Require at least a certain subscription level
 * @param plan - Minimum required subscription plan
 * @example @MinSubscription(SubscriptionPlan.BASIC)
 */
export const MinSubscription = (plan: SubscriptionPlan) =>
  SetMetadata(MIN_SUBSCRIPTION_KEY, plan);
