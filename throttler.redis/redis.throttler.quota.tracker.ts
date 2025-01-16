import { IThrottlingQuotaTracker } from "../promise.throttler.types.ts";
import redis from "../redis.ts";

const redisThrottlerQuotaTrackerMinutesTtl: number = 60;

export class RedisThrottlingQuotaTracker
  implements IThrottlingQuotaTracker {
  set = async (
    key: string,
    value: string | number,
  ): Promise<void> => {
    await redis.set(
      key,
      value,
      "EX",
      redisThrottlerQuotaTrackerMinutesTtl * 60,
    );
  };

  get = async (key: string): Promise<number> => {
    const redisCurrentQuotaConsumed = await redis.get(key);
    return redisCurrentQuotaConsumed ? parseInt(redisCurrentQuotaConsumed) : 0;
  };
}
