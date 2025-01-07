import { IPromiseThrottlerQuotaTracker } from "../promise.throttler.types.ts";

const quotaTrackers: Record<string, { current: number }> = {};

const getQuotaTracker = (lockKey: string) => {
  if (!quotaTrackers[lockKey]) {
    quotaTrackers[lockKey] = { current: 0 };
  }
  return quotaTrackers[lockKey];
};

export class MemoryThrottlerQuotaTracker implements IPromiseThrottlerQuotaTracker {
  set = (key: string, value: string | number, _minutesTtl?: number): Promise<void> => {
    const quotaTracker = getQuotaTracker(key);
    quotaTracker.current = parseInt(value.toString());
    return Promise.resolve();
  }

  get = (key: string): Promise<number> => {
    return Promise.resolve(getQuotaTracker(key).current);
  }
}