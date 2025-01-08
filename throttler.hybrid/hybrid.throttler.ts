import {
  throttlerConfig,
  VehicleCompanyAtmsThrottlerKeysGenerator,
  vehicleCompanyAtmsThrottlerKeysGeneratorInput,
} from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { MemoryThrottlerLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";
import { RedisThrottlerQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new VehicleCompanyAtmsThrottlerKeysGenerator(
    vehicleCompanyAtmsThrottlerKeysGeneratorInput,
  ),
  new MemoryThrottlerLocksGenerator(),
  new RedisThrottlerQuotaTracker(),
);
