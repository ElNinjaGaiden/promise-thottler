import { ThrottlingOperation } from "../promise.throttler.types.ts";
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

  substract = async (
    key: string,
    // deno-lint-ignore no-explicit-any
    _operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    const currentValue = await redis.get(key);
    await redis.set(
      key,
      currentValue ? parseInt(currentValue) - 1 : 0,
      "EX",
      redisThrottlerQuotaTrackerMinutesTtl * 60,
    );
  };

  current = async (
    key: string,
  ): Promise<number> => {
    const redisCurrentQuotaConsumed = await redis.get(key);
    return redisCurrentQuotaConsumed ? parseInt(redisCurrentQuotaConsumed) : 0;
  };
}
