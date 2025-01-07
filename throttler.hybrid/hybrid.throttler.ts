import { throttlerConfig } from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { MemoryThrottlerLocker } from "../throttler.memory/memory.throttler.locker.ts";
import { RedisThrottlerQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";
import { MemoryThrottlerFinisher } from "../throttler.memory/memory.throttler.finisher.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new MemoryThrottlerLocker(),
  new RedisThrottlerQuotaTracker(),
  new MemoryThrottlerFinisher(),
);
