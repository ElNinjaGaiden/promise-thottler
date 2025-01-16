import {
  scalabilityAwareThottlingConfig,
} from "../throttler.config.ts";
import {
  IThrottlingLocksGenerator,
  IThrottlingQuotaTracker,
} from "../promise.throttler.types.ts";
import { RedisThrottlingLocksGenerator } from "../throttler.redis/redis.throttler.locker.ts";
import { RedisThrottlingQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";
import { InMemoryThrottlingQuotaTracker } from "../throttler.memory/memory.throttler.quota.tracker.ts";
import { InMemoryThrottlingLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";
import { IThrottlingMechanism } from "../test.ts";

const autoScalabilityDisabledCorrectly =
scalabilityAwareThottlingConfig.autoScaleEnabled === false &&
scalabilityAwareThottlingConfig.processors &&
scalabilityAwareThottlingConfig.processors >= 1;
if (
  scalabilityAwareThottlingConfig.autoScaleEnabled === false &&
  !autoScalabilityDisabledCorrectly
) {
  throw new Error(
    "If autoScaleEnabled is set to false, static processors number needs to be provided",
  );
}

const throttlingLocksGenerator: IThrottlingLocksGenerator =
scalabilityAwareThottlingConfig.autoScaleEnabled
    ? new RedisThrottlingLocksGenerator()
    : new InMemoryThrottlingLocksGenerator();
const throttlingQuotaTracker: IThrottlingQuotaTracker =
scalabilityAwareThottlingConfig.autoScaleEnabled
    ? new RedisThrottlingQuotaTracker()
    : new InMemoryThrottlingQuotaTracker();

export const getThrottlerMechanismTest = (): IThrottlingMechanism => ({
  throttlingLocksGenerator,
  throttlingQuotaTracker,
});
