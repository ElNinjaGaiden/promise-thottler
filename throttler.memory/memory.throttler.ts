import {
  throttlerConfig,
  VehicleCompanyAtmsThrottlerKeysGenerator,
  vehicleCompanyAtmsThrottlerKeysGeneratorInput,
} from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { MemoryThrottlerLocksGenerator } from "./memory.throttler.locker.ts";
import { MemoryThrottlerQuotaTracker } from "./memory.throttler.quota.tracker.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new VehicleCompanyAtmsThrottlerKeysGenerator(
    vehicleCompanyAtmsThrottlerKeysGeneratorInput,
  ),
  new MemoryThrottlerLocksGenerator(),
  new MemoryThrottlerQuotaTracker(),
);
