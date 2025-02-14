import Redlock from "npm:redlock";
import {
  IThrottlingLock,
  IThrottlingLocksGenerator,
} from "../promise.throttler.types.ts";
import redis from "../redis.ts";
import { v4 as uuidv4 } from "uuid";
import { sortedInsert } from "../utils/index.ts";
import { IThrottlingLockAcquire } from "../promise.throttler.types.ts";

const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: -1,
  retryDelay: 500,
  retryJitter: 200,
  automaticExtensionThreshold: 500,
});

const locksGenerators: Record<string, RedisThrottlingLocksGenerator> = {};
const locks: Record<string, { isLocked: boolean }> = {};

const getRedisThrottlingLocksGenerator = (lockKey: string) => {
  if (!locksGenerators[lockKey]) {
    locksGenerators[lockKey] = new RedisThrottlingLocksGenerator(lockKey);
  }
  return locksGenerators[lockKey];
};

const getRedisLock = (lockKey: string) => {
  if (!locks[lockKey]) {
    locks[lockKey] = { isLocked: false };
  }
  return locks[lockKey];
};

interface RedisAcquireWrapper extends IThrottlingLockAcquire {
  lock: RedisThrottlingLock;
}

class RedisThrottlingLock implements IThrottlingLock {
  private _wrappedLock: IThrottlingLock | null = null;
  constructor(
    readonly redisThrottlingLocksGenerator: RedisThrottlingLocksGenerator,
  ) {}

  set wrappedLock (lock: IThrottlingLock) {
    this._wrappedLock = lock;
  }

  release = async (): Promise<void> => {
    if (this._wrappedLock) {
      await this._wrappedLock.release();
      this._wrappedLock = null;
    }
    this.redisThrottlingLocksGenerator.locked = false;
    return await Promise.resolve();
  };
}

export class RedisThrottlingLocksGenerator
  implements IThrottlingLocksGenerator {

  private acquires: Array<RedisAcquireWrapper> = [];
  private readonly interval: number | null = null;

  constructor(readonly lockKey: string) {
    this.interval = setInterval(this.checkForAcquires.bind(this), 100);
  }

  get locked(): boolean {
    return getRedisLock(this.lockKey).isLocked;
  }

  set locked(isLocked: boolean) {
    const lock = getRedisLock(this.lockKey);
    lock.isLocked = isLocked;
  }

  private checkForAcquires = async () => {
    if (!this.locked) {
      const acquire = this.acquires.shift();
      if (acquire) {
        this.locked = true;
        const redLock = await redlock.acquire([this.lockKey], 5000);
        acquire.lock.wrappedLock = {
          release: async () => {
            await redLock.release();
          }
        };
        acquire.resolve(acquire.lock);
      }
    }
  };

  acquire = (lockKey: string, operationTimestamp: number): Promise<IThrottlingLock> => {
    const redisThrottlerLocksGenerator = getRedisThrottlingLocksGenerator(lockKey);
    const redisThrottlerLock = new RedisThrottlingLock(
      redisThrottlerLocksGenerator,
    );
    return new Promise((resolve) => {
      sortedInsert(redisThrottlerLocksGenerator.acquires, {
        id: uuidv4(),
        timestamp: operationTimestamp,
        lock: redisThrottlerLock,
        resolve,
      }, (a, b) => a.timestamp - b.timestamp);
    });
  };
}
