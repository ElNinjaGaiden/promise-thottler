import { IThrottlingMechanism } from "../test.ts";
import { RedisThrottlingLocksGenerator } from "./redis.throttler.locker.ts";
import { RedisThrottlingQuotaTracker } from "./redis.throttler.quota.tracker.ts";

export const getThrottlingMechanismTest = (): IThrottlingMechanism => ({
  throttlingLocksGenerator: new RedisThrottlingLocksGenerator(),
  throttlingQuotaTracker: new RedisThrottlingQuotaTracker(),
});
