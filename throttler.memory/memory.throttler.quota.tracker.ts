import { IThrottlingQuotaTracker } from "../promise.throttler.types.ts";

const quotaTrackers: Record<string, { current: number }> = {};

const getQuotaTracker = (lockKey: string) => {
  if (!quotaTrackers[lockKey]) {
    quotaTrackers[lockKey] = { current: 0 };
  }
  return quotaTrackers[lockKey];
};

export class InMemoryThrottlingQuotaTracker implements IThrottlingQuotaTracker {
  set = (key: string, value: string | number): Promise<void> => {
    const quotaTracker = getQuotaTracker(key);
    quotaTracker.current = parseInt(value.toString());
    return Promise.resolve();
  };

  get = (key: string): Promise<number> => {
    return Promise.resolve(getQuotaTracker(key).current);
  };
}
