import { IPromiseThrottlerFinisher } from "../promise.throttler.types.ts";
// import redis from "../redis.ts";
import { getMemoryLocker } from "./memory.throttler.locker.ts";

export class MemoryThrottlerFinisher implements IPromiseThrottlerFinisher {
  finish = (lockKey: string) => {
    const locker = getMemoryLocker(lockKey);
    if (locker) {
      locker.finish(lockKey);
    }
    // redis.disconnect();
    // Still not sure why need to Deno.exit, under research...
    Deno.exit(0);
  };
}
