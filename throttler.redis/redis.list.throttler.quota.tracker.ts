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

export class RedisListThrottlingQuotaTracker
  implements IThrottlingQuotaTracker {
  add = async (
    key: string,
    // deno-lint-ignore no-explicit-any
    operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    const track: ThrottlingOperationTrack = {
      url: operation.url,
      timestamp: moment().toISOString(),
      id: uuidv4(),
    };
    const listLength = await redis.lpush(key, JSON.stringify(track));
    if (listLength === 1) {
      // Set the expiration if it is the first item added
      await redis.expire(key, redisThrottlerQuotaTrackerMinutesTtl * 60);
    }
  };

  canProceed = async (
    key: string,
    throttlerConfig: EndpointsThrottlingConfig,
  ): Promise<boolean> => {
    const currentQuotaConsumed = await redis.llen(key);
    const { operationsPerPeriod } = throttlerConfig;
    return currentQuotaConsumed < operationsPerPeriod;
  };
}
