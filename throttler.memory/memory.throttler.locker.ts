import {
  IThrottlingLock,
  IThrottlingLockAcquire,
  IThrottlingLocksGenerator,
} from "../promise.throttler.types.ts";
import { v4 as uuidv4 } from "uuid";

const locksGenerators: Record<string, InMemoryThrottlingLocksGenerator> = {};
const locks: Record<string, { isLocked: boolean }> = {};

const getInMemoryLocksGenerator = (lockKey: string) => {
  if (!locksGenerators[lockKey]) {
    locksGenerators[lockKey] = new InMemoryThrottlingLocksGenerator(lockKey);
  }
  return locksGenerators[lockKey];
};

const getInMemoryLock = (lockKey: string) => {
  if (!locks[lockKey]) {
    locks[lockKey] = { isLocked: false };
  }
  return locks[lockKey];
};

class InMemoryThrottlingLock implements IThrottlingLock {
  constructor(
    readonly inMemoryThrottlingLocksGenerator: InMemoryThrottlingLocksGenerator,
  ) {}
  release = async (): Promise<void> => {
    this.inMemoryThrottlingLocksGenerator.locked = false;
    return await Promise.resolve();
  };
}

export class InMemoryThrottlingLocksGenerator
  implements IThrottlingLocksGenerator {
  private acquires: Array<IThrottlingLockAcquire> = [];
  private interval: number | null = null;

  constructor(readonly lockKey: string) {
    this.interval = setInterval(this.checkForAcquires.bind(this), 100);
  }

  get locked(): boolean {
    return getInMemoryLock(this.lockKey).isLocked;
  }

  set locked(isLocked: boolean) {
    const lock = getInMemoryLock(this.lockKey);
    lock.isLocked = isLocked;
  }

  private checkForAcquires = () => {
    if (!this.locked) {
      const acquire = this.acquires.shift();
      if (acquire) {
        acquire.resolve(acquire.lock);
        this.locked = true;
      }
    }
  };

  acquire = (
    lockKey: string,
    operationTimestamp: number,
  ): Promise<IThrottlingLock> => {
    const memoryThrottlerLocksGenerator = getInMemoryLocksGenerator(lockKey);
    const memoryThrottlerLock = new InMemoryThrottlingLock(
      memoryThrottlerLocksGenerator,
    );
    return new Promise((resolve) => {
      memoryThrottlerLocksGenerator.acquires.push({
        id: uuidv4(),
        timestamp: operationTimestamp,
        lock: memoryThrottlerLock,
        resolve,
      });
    });
  };
}
