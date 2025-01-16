import { InMemoryThrottlingLocksGenerator } from "./memory.throttler.locker.ts";
import { InMemoryThrottlingQuotaTracker } from "./memory.throttler.quota.tracker.ts";
import { IThrottlingMechanism } from "../test.ts";

export const getThrottlingMechanismTest = (): IThrottlingMechanism => ({
  throttlingLocksGenerator: new InMemoryThrottlingLocksGenerator(),
  throttlingQuotaTracker: new InMemoryThrottlingQuotaTracker(),
});
