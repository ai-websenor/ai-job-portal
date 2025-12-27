import { SubscriptionPlan } from '../constants/enums';
export declare const SUBSCRIPTION_KEY = "subscription";
export declare const RequireSubscription: (...plans: SubscriptionPlan[]) => import("node_modules/@nestjs/common").CustomDecorator<string>;
export declare const MIN_SUBSCRIPTION_KEY = "minSubscription";
export declare const MinSubscription: (plan: SubscriptionPlan) => import("node_modules/@nestjs/common").CustomDecorator<string>;
