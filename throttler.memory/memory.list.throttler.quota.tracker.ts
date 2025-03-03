import { ThrottlingOperationTrack } from "../promise.throttler.types.ts";
import { ThrottlingOperation } from "../promise.throttler.types.ts";
import { IThrottlingQuotaTracker } from "../promise.throttler.types.ts";

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
      arrivedAt: operation.arrivedAt.toISOString(),
      executedAt: operation.executedAt
        ? operation.executedAt.toISOString()
        : "no execution time provided",
      id: operation.id,
    });
    return Promise.resolve();
  };

  substract = (
    key: string,
    // deno-lint-ignore no-explicit-any
    operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    const quotaTracker = getQuotaTracker(key);
    quotaTracker.operations = quotaTracker.operations.filter((o) =>
      o.id !== operation.id
    );
    return Promise.resolve();
  };

  current = (
    key: string,
  ): Promise<number> => {
    const { operations } = getQuotaTracker(key);
    return Promise.resolve(operations.length);
  };
}
