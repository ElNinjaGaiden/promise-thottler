import { ThrottlingOperation } from "../promise.throttler.types.ts";
import {
  IThrottlingQuotaTracker,
  ThrottlingOperationTrack,
} from "../promise.throttler.types.ts";
import redis from "../redis.ts";
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
      timestamp: operation.executionTime || "no execution time provided",
      id: operation.id,
    };
    const listLength = await redis.lpush(key, JSON.stringify(track));
    if (listLength === 1) {
      // Set the expiration if it is the first item added
      await redis.expire(key, redisThrottlerQuotaTrackerMinutesTtl * 60);
    }
  };

  substract = async (
    key: string,
    // deno-lint-ignore no-explicit-any
    operation: ThrottlingOperation<any, any>,
  ): Promise<void> => {
    const track: ThrottlingOperationTrack = {
      url: operation.url,
      timestamp: operation.executionTime || "no execution time provided",
      id: uuidv4(),
    };
    const listLength = await redis.lrem(key, 1, JSON.stringify(track));
    if (listLength === 1) {
      // Set the expiration if it is the first item added
      await redis.expire(key, redisThrottlerQuotaTrackerMinutesTtl * 60);
    }
  };

  current = async (
    key: string,
  ): Promise<number> => {
    return await redis.llen(key);
  };
}
