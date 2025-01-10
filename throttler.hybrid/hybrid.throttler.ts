import {
  throttlerConfig,
  VehicleCompanyAtmsThrottlerKeysGenerator,
  vehicleCompanyAtmsThrottlerKeysGeneratorInput,
} from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { RedisThrottlerQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";
import { InMemoryThrottlerLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new VehicleCompanyAtmsThrottlerKeysGenerator(
    vehicleCompanyAtmsThrottlerKeysGeneratorInput,
  ),
  new InMemoryThrottlerLocksGenerator(),
  new RedisThrottlerQuotaTracker(),
);
