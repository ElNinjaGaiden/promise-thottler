import {
  IThrottlingLock,
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

interface Acquire {
  id: string;
  resolve: (
    value: InMemoryThrottlingLock | PromiseLike<InMemoryThrottlingLock>,
  ) => void;
  lock: InMemoryThrottlingLock;
}

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
  public acquires: Array<Acquire> = [];
  public interval: number | null = null;

  constructor(readonly lockKey: string) {
    this.interval = setInterval(this.checkForAcquires.bind(this), 200);
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
        this.acquires = this.acquires.filter((a) => a.id !== acquire.id);
        acquire.resolve(acquire.lock);
        this.locked = true;
      }
    }
  };

  acquire = (lockKey: string): Promise<IThrottlingLock> => {
    const memoryThrottlerLocksGenerator = getInMemoryLocksGenerator(lockKey);
    const memoryThrottlerLock = new InMemoryThrottlingLock(
      memoryThrottlerLocksGenerator,
    );
    return new Promise((resolve) => {
      memoryThrottlerLocksGenerator.acquires.push({
        id: uuidv4(),
        lock: memoryThrottlerLock,
        resolve,
      });
    });
  };
}
