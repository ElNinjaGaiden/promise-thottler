import { IThrottlingMechanism } from "../test.ts";
import { InMemoryThrottlingLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";
import { RedisThrottlingQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";

export const getThrottlingMechanismTest = (): IThrottlingMechanism => ({
  throttlingLocksGenerator: new InMemoryThrottlingLocksGenerator(),
  throttlingQuotaTracker: new RedisThrottlingQuotaTracker(),
});
