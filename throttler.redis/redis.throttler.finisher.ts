import { IPromiseThrottlerFinisher } from "../promise.throttler.types.ts";
import redis from "../redis.ts";

export class RedisThrottlerFinisher implements IPromiseThrottlerFinisher {
  finish = () => {
    redis.disconnect();
  };
}
