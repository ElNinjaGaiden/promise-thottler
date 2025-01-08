import {
  throttlerConfig,
  VehicleCompanyAtmsThrottlerKeysGenerator,
  vehicleCompanyAtmsThrottlerKeysGeneratorInput,
} from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { RedisThrottlerLocksGenerator } from "./redis.throttler.locker.ts";
import { RedisThrottlerQuotaTracker } from "./redis.throttler.quota.tracker.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new VehicleCompanyAtmsThrottlerKeysGenerator(
    vehicleCompanyAtmsThrottlerKeysGeneratorInput,
  ),
  new RedisThrottlerLocksGenerator(),
  new RedisThrottlerQuotaTracker(),
);
