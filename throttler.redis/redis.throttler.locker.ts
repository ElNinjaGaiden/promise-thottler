import Redlock from "npm:redlock";
import {
  IThrottlingLock,
  IThrottlingLocksGenerator,
} from "../promise.throttler.types.ts";
import redis from "../redis.ts";

const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: -1,
  retryDelay: 500,
  retryJitter: 200,
  automaticExtensionThreshold: 500,
});

export class RedisThrottlingLocksGenerator
  implements IThrottlingLocksGenerator {
  acquire = async (lockKey: string): Promise<IThrottlingLock> => {
    const redisLock = await redlock.acquire([lockKey], 5000);
    const lock: IThrottlingLock = {
      release: async () => {
        await redisLock.release();
      },
    };
    return lock;
  };
}
