import {
  EndpointsThrottlingConfig,
  ThrottlingOperation,
} from "../promise.throttler.types.ts";
import {
  IThrottlingQuotaTracker,
  ThrottlingOperationTrack,
} from "../promise.throttler.types.ts";
import redis from "../redis.ts";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

const redisThrottlerQuotaTrackerMinutesTtl: number = 180;

export class RedisThrottlingQuotaTracker implements IThrottlingQuotaTracker {
  add = async (
    key: string,
    // deno-lint-ignore no-explicit-any
    operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    // const currentValue = await redis.get(key);
    // await redis.set(
    //   key,
    //   currentValue ? parseInt(currentValue) + 1 : 1,
    //   "EX",
    //   redisThrottlerQuotaTrackerMinutesTtl * 60,
    // );
    const track: ThrottlingOperationTrack = {
      url: operation.url,
      timestamp: moment().toISOString(),
      id: uuidv4(),
    };
    await redis.lpush(key, JSON.stringify(track));
  };

  canProceed = async (
    key: string,
    throttlerConfig: EndpointsThrottlingConfig,
  ): Promise<boolean> => {
    // const redisCurrentQuotaConsumed = await redis.get(key);
    // const currentQuotaConsumed = redisCurrentQuotaConsumed
    //   ? parseInt(redisCurrentQuotaConsumed)
    //   : 0;
    const currentQuotaConsumed = await redis.llen(key);
    const { operationsPerPeriod } = throttlerConfig;
    return currentQuotaConsumed < operationsPerPeriod;
  };
}
