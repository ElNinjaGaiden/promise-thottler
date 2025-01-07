import { IPromiseThrottlerLock, IPromiseThrottlerLocker } from "../promise.throttler.types.ts";
import { v4 as uuidv4 } from "uuid";

const lockers: Record<string, MemoryThrottlerLocker> = {};

export const getMemoryLocker = (lockKey: string) => {
  if (!lockers[lockKey]) {
    lockers[lockKey] = new MemoryThrottlerLocker();
  }
  return lockers[lockKey];
};

interface Acquire {
  id: string;
  resolve: (value: MemoryThrottlerLock | PromiseLike<MemoryThrottlerLock>) => void;
  lock: MemoryThrottlerLock;
}

class MemoryThrottlerLock implements IPromiseThrottlerLock {
  release = async (): Promise<void> => {
    MemoryThrottlerLocker.locked = false;
    return await Promise.resolve();
  };
}

export class MemoryThrottlerLocker implements IPromiseThrottlerLocker {
  static locked: boolean = false;
  public acquires: Array<Acquire> = [];
  public interval: number | null = null;

  constructor() {
    this.interval = setInterval(this.checkForAcquires.bind(this), 200);
  }

  private checkForAcquires = () => {
    if (!MemoryThrottlerLocker.locked) {
      const acquire = this.acquires.shift();
      if (acquire) {
        this.acquires = this.acquires.filter((a) => a.id !== acquire.id);
        acquire.resolve(acquire.lock);
        MemoryThrottlerLocker.locked = true;
      }
    }
  }

  acquire = (lockKey: string): Promise<IPromiseThrottlerLock> => {
    const memoryThrottlerLocker = getMemoryLocker(lockKey);
    const memoryThrottlerLock = new MemoryThrottlerLock();
    return new Promise((resolve) => {
      memoryThrottlerLocker.acquires.push({
        id: uuidv4(),
        lock: memoryThrottlerLock,
        resolve,
      });
    });
  };

  finish = (lockKey: string) => {
    const locker = getMemoryLocker(lockKey);
    if (locker) {
      if (locker.interval) clearInterval(locker.interval);
      delete lockers[lockKey];
    }
  };
}
