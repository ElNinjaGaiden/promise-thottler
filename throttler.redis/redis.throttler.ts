import { throttlerConfig } from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { RedisThrottlerLocker } from "./redis.throttler.locker.ts";
import { RedisThrottlerQuotaTracker } from "./redis.throttler.quota.tracker.ts";
import { RedisThrottlerFinisher } from "./redis.throttler.finisher.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new RedisThrottlerLocker(),
  new RedisThrottlerQuotaTracker(),
  new RedisThrottlerFinisher(),
);
