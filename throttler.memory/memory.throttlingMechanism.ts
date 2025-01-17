import { InMemoryThrottlingLocksGenerator } from "./memory.throttler.locker.ts";
import { InMemoryThrottlingQuotaTracker } from "./memory.throttler.quota.tracker.ts";
import { IThrottlingMechanism } from "../test.ts";

export const getThrottlingMechanismTest = (
  lockKey: string,
): IThrottlingMechanism => ({
  throttlingLocksGenerator: new InMemoryThrottlingLocksGenerator(lockKey),
  throttlingQuotaTracker: new InMemoryThrottlingQuotaTracker(),
});
