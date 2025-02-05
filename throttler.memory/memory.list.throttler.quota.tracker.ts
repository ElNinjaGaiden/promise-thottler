import { ThrottlingOperationTrack } from "../promise.throttler.types.ts";
import { ThrottlingOperation } from "../promise.throttler.types.ts";
import { IThrottlingQuotaTracker } from "../promise.throttler.types.ts";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

const quotaTrackers: Record<
  string,
  { operations: Array<ThrottlingOperationTrack> }
> = {};

const getQuotaTracker = (lockKey: string) => {
  if (!quotaTrackers[lockKey]) {
    quotaTrackers[lockKey] = { operations: [] };
  }
  return quotaTrackers[lockKey];
};

export class InMemoryListThrottlingQuotaTracker
  implements IThrottlingQuotaTracker {
  add = (
    key: string,
    // deno-lint-ignore no-explicit-any
    operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    const quotaTracker = getQuotaTracker(key);
    quotaTracker.operations.push({
      url: operation.url,
      timestamp: moment().toISOString(),
      id: uuidv4(),
    });
    return Promise.resolve();
  };

  current = (
    key: string,
  ): Promise<number> => {
    const { operations } = getQuotaTracker(key);
    return Promise.resolve(operations.length);
  };
}
