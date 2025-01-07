import { IPromiseThrottlerQuotaTracker } from "../promise.throttler.types.ts";
import redis from "../redis.ts";

export class RedisThrottlerQuotaTracker implements IPromiseThrottlerQuotaTracker {
  set = async (
    key: string,
    value: string | number,
    minutesTtl?: number,
  ): Promise<void> => {
    if (minutesTtl) {
      await redis.set(key, value, "EX", minutesTtl * 60);
    } else {
      await redis.set(key, value);
    }
  };

  get = async (key: string): Promise<number> => {
    const redisCurrentQuotaConsumed = await redis.get(key);
    return redisCurrentQuotaConsumed ? parseInt(redisCurrentQuotaConsumed) : 0;
  };
}
