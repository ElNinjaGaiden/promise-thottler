import Redlock from "npm:redlock";
import { IPromiseThrottlerLock, IPromiseThrottlerLocker } from "../promise.throttler.types.ts";
import redis from "../redis.ts";

const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: -1,
  retryDelay: 500,
  retryJitter: 200,
  automaticExtensionThreshold: 500,
});

export class RedisThrottlerLocker implements IPromiseThrottlerLocker {
  acquire = async (lockKey: string): Promise<IPromiseThrottlerLock> => {
    const redisLock = await redlock.acquire([lockKey], 5000);
    const lock: IPromiseThrottlerLock = {
      release: async () => {
        await redisLock.release();
      },
    };
    return lock;
  };
}
