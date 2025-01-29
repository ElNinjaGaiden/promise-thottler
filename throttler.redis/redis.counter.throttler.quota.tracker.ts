import {
  EndpointsThrottlingConfig,
  ThrottlingOperation,
} from "../promise.throttler.types.ts";
import { IThrottlingQuotaTracker } from "../promise.throttler.types.ts";
import redis from "../redis.ts";

const redisThrottlerQuotaTrackerMinutesTtl: number = 180;

export class RedisCounterThrottlingQuotaTracker
  implements IThrottlingQuotaTracker {
  add = async (
    key: string,
    // deno-lint-ignore no-explicit-any
    _operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    const currentValue = await redis.get(key);
    await redis.set(
      key,
      currentValue ? parseInt(currentValue) + 1 : 1,
      "EX",
      redisThrottlerQuotaTrackerMinutesTtl * 60,
    );
  };

  canProceed = async (
    key: string,
    throttlerConfig: EndpointsThrottlingConfig,
  ): Promise<boolean> => {
    const redisCurrentQuotaConsumed = await redis.get(key);
    const currentQuotaConsumed = redisCurrentQuotaConsumed
      ? parseInt(redisCurrentQuotaConsumed)
      : 0;
    const { operationsPerPeriod } = throttlerConfig;
    return currentQuotaConsumed < operationsPerPeriod;
  };
}
