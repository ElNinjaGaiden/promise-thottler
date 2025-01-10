import {
  throttlerConfig,
  VehicleCompanyAtmsThrottlerKeysGenerator,
  vehicleCompanyAtmsThrottlerKeysGeneratorInput,
} from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import { InMemoryThrottlerLocksGenerator } from "./memory.throttler.locker.ts";
import { InMemoryThrottlerQuotaTracker } from "./memory.throttler.quota.tracker.ts";

export const throttler = new PromiseThrottler(
  throttlerConfig,
  new VehicleCompanyAtmsThrottlerKeysGenerator(
    vehicleCompanyAtmsThrottlerKeysGeneratorInput,
  ),
  new InMemoryThrottlerLocksGenerator(),
  new InMemoryThrottlerQuotaTracker(),
);
