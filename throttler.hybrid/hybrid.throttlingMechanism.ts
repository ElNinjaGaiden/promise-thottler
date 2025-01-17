import { IThrottlingMechanism } from "../test.ts";
import { InMemoryThrottlingLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";
import { RedisThrottlingQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";

export const getThrottlingMechanismTest = (
  lockKey: string,
): IThrottlingMechanism => ({
  throttlingLocksGenerator: new InMemoryThrottlingLocksGenerator(lockKey),
  throttlingQuotaTracker: new RedisThrottlingQuotaTracker(),
});
