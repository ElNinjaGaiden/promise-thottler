import { throttlerConfig } from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { MemoryThrottlerLocker } from "./memory.throttler.locker.ts";
import { MemoryThrottlerFinisher } from "./memory.throttler.finisher.ts";
import { MemoryThrottlerQuotaTracker } from "./memory.throttler.quota.tracker.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new MemoryThrottlerLocker(),
  new MemoryThrottlerQuotaTracker(),
  new MemoryThrottlerFinisher(),
);
