import { ThrottlingOperation } from "../promise.throttler.types.ts";
import { IThrottlingQuotaTracker } from "../promise.throttler.types.ts";

const quotaTrackers: Record<
  string,
  { current: number }
> = {};

const getQuotaTracker = (lockKey: string) => {
  if (!quotaTrackers[lockKey]) {
    quotaTrackers[lockKey] = { current: 0 };
  }
  return quotaTrackers[lockKey];
};

export class InMemoryCounterThrottlingQuotaTracker
  implements IThrottlingQuotaTracker {
  add = (
    key: string,
    // deno-lint-ignore no-explicit-any
    _operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    const quotaTracker = getQuotaTracker(key);
    quotaTracker.current += 1;
    return Promise.resolve();
  };

  current = (
    key: string,
  ): Promise<number> => {
    const { current } = getQuotaTracker(key);
    return Promise.resolve(current);
  };
}
