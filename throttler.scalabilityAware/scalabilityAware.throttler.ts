import {
  scalabilityAwareThottlerConfig,
  VehicleCompanyAtmsThrottlerKeysGenerator,
  vehicleCompanyAtmsThrottlerKeysGeneratorInput,
} from "../throttler.config.ts";
import { PromiseThrottler } from "../promise.throttler.ts";
import {
  IPromiseThrottlerLocksGenerator,
  IPromiseThrottlerQuotaTracker,
} from "../promise.throttler.types.ts";
import { RedisThrottlerLocksGenerator } from "../throttler.redis/redis.throttler.locker.ts";
import { RedisThrottlerQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";
import { InMemoryThrottlerQuotaTracker } from "../throttler.memory/memory.throttler.quota.tracker.ts";
import { InMemoryThrottlerLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";

const autoScalabilityDisabledCorrectly =
  scalabilityAwareThottlerConfig.autoScaleEnabled === false &&
  scalabilityAwareThottlerConfig.processors &&
  scalabilityAwareThottlerConfig.processors >= 1;
if (
  scalabilityAwareThottlerConfig.autoScaleEnabled === false &&
  !autoScalabilityDisabledCorrectly
) {
  throw new Error(
    "If autoScaleEnabled is set to false, static processors number needs to be provided",
  );
}

const throttlerLocksGenerator: IPromiseThrottlerLocksGenerator =
  scalabilityAwareThottlerConfig.autoScaleEnabled
    ? new RedisThrottlerLocksGenerator()
    : new InMemoryThrottlerLocksGenerator();
const throttlerQuotaTracker: IPromiseThrottlerQuotaTracker =
  scalabilityAwareThottlerConfig.autoScaleEnabled
    ? new RedisThrottlerQuotaTracker()
    : new InMemoryThrottlerQuotaTracker();

export const throttler = new PromiseThrottler(
  {
    ...scalabilityAwareThottlerConfig,
    // If auto scalabilty is disabled, it means the number of processors is static, meaning we can simply
    // split the entire operations per minute into the number of processors, like provide a quota to each processor
    operationsPerMinute:
      scalabilityAwareThottlerConfig.autoScaleEnabled === false &&
        autoScalabilityDisabledCorrectly
        ? Math.floor(
          scalabilityAwareThottlerConfig.operationsPerMinute /
            (scalabilityAwareThottlerConfig.processors ?? 1),
        )
        : scalabilityAwareThottlerConfig.operationsPerMinute,
  },
  new VehicleCompanyAtmsThrottlerKeysGenerator(
    vehicleCompanyAtmsThrottlerKeysGeneratorInput,
  ),
  throttlerLocksGenerator,
  throttlerQuotaTracker,
);
