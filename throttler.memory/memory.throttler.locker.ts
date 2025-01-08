import {
  IPromiseThrottlerLock,
  IPromiseThrottlerLocksGenerator,
} from "../promise.throttler.types.ts";
import { v4 as uuidv4 } from "uuid";

const locksGenerators: Record<string, MemoryThrottlerLocksGenerator> = {};

export const getMemoryLocksGenerator = (lockKey: string) => {
  if (!locksGenerators[lockKey]) {
    locksGenerators[lockKey] = new MemoryThrottlerLocksGenerator();
  }
  return locksGenerators[lockKey];
};

interface Acquire {
  id: string;
  resolve: (
    value: MemoryThrottlerLock | PromiseLike<MemoryThrottlerLock>,
  ) => void;
  lock: MemoryThrottlerLock;
}

class MemoryThrottlerLock implements IPromiseThrottlerLock {
  release = async (): Promise<void> => {
    MemoryThrottlerLocksGenerator.locked = false;
    return await Promise.resolve();
  };
}

export class MemoryThrottlerLocksGenerator
  implements IPromiseThrottlerLocksGenerator {
  static locked: boolean = false;
  public acquires: Array<Acquire> = [];
  public interval: number | null = null;

  constructor() {
    this.interval = setInterval(this.checkForAcquires.bind(this), 200);
  }

  private checkForAcquires = () => {
    if (!MemoryThrottlerLocksGenerator.locked) {
      const acquire = this.acquires.shift();
      if (acquire) {
        this.acquires = this.acquires.filter((a) => a.id !== acquire.id);
        acquire.resolve(acquire.lock);
        MemoryThrottlerLocksGenerator.locked = true;
      }
    }
  };

  acquire = (lockKey: string): Promise<IPromiseThrottlerLock> => {
    const memoryThrottlerLocksGenerator = getMemoryLocksGenerator(lockKey);
    const memoryThrottlerLock = new MemoryThrottlerLock();
    return new Promise((resolve) => {
      memoryThrottlerLocksGenerator.acquires.push({
        id: uuidv4(),
        lock: memoryThrottlerLock,
        resolve,
      });
    });
  };
}
