import {
  IPromiseThrottlerLock,
  IPromiseThrottlerLocksGenerator,
} from "../promise.throttler.types.ts";
import { v4 as uuidv4 } from "uuid";

const locksGenerators: Record<string, InMemoryThrottlerLocksGenerator> = {};

const getInMemoryLocksGenerator = (lockKey: string) => {
  if (!locksGenerators[lockKey]) {
    locksGenerators[lockKey] = new InMemoryThrottlerLocksGenerator();
  }
  return locksGenerators[lockKey];
};

interface Acquire {
  id: string;
  resolve: (
    value: InMemoryThrottlerLock | PromiseLike<InMemoryThrottlerLock>,
  ) => void;
  lock: InMemoryThrottlerLock;
}

class InMemoryThrottlerLock implements IPromiseThrottlerLock {
  release = async (): Promise<void> => {
    InMemoryThrottlerLocksGenerator.locked = false;
    return await Promise.resolve();
  };
}

export class InMemoryThrottlerLocksGenerator
  implements IPromiseThrottlerLocksGenerator {
  static locked: boolean = false;
  public acquires: Array<Acquire> = [];
  public interval: number | null = null;

  constructor() {
    this.interval = setInterval(this.checkForAcquires.bind(this), 200);
  }

  private checkForAcquires = () => {
    if (!InMemoryThrottlerLocksGenerator.locked) {
      const acquire = this.acquires.shift();
      if (acquire) {
        this.acquires = this.acquires.filter((a) => a.id !== acquire.id);
        acquire.resolve(acquire.lock);
        InMemoryThrottlerLocksGenerator.locked = true;
      }
    }
  };

  acquire = (lockKey: string): Promise<IPromiseThrottlerLock> => {
    const memoryThrottlerLocksGenerator = getInMemoryLocksGenerator(lockKey);
    const memoryThrottlerLock = new InMemoryThrottlerLock();
    return new Promise((resolve) => {
      memoryThrottlerLocksGenerator.acquires.push({
        id: uuidv4(),
        lock: memoryThrottlerLock,
        resolve,
      });
    });
  };
}
