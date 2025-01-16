import {
  IThrottlingLock,
  IThrottlingLocksGenerator,
} from "../promise.throttler.types.ts";
import { v4 as uuidv4 } from "uuid";

const locksGenerators: Record<string, InMemoryThrottlingLocksGenerator> = {};

const getInMemoryLocksGenerator = (lockKey: string) => {
  if (!locksGenerators[lockKey]) {
    locksGenerators[lockKey] = new InMemoryThrottlingLocksGenerator();
  }
  return locksGenerators[lockKey];
};

interface Acquire {
  id: string;
  resolve: (
    value: InMemoryThrottlingLock | PromiseLike<InMemoryThrottlingLock>,
  ) => void;
  lock: InMemoryThrottlingLock;
}

class InMemoryThrottlingLock implements IThrottlingLock {
  release = async (): Promise<void> => {
    InMemoryThrottlingLocksGenerator.locked = false;
    return await Promise.resolve();
  };
}

export class InMemoryThrottlingLocksGenerator
  implements IThrottlingLocksGenerator {
  static locked: boolean = false;
  public acquires: Array<Acquire> = [];
  public interval: number | null = null;

  constructor() {
    this.interval = setInterval(this.checkForAcquires.bind(this), 200);
  }

  private checkForAcquires = () => {
    if (!InMemoryThrottlingLocksGenerator.locked) {
      const acquire = this.acquires.shift();
      if (acquire) {
        this.acquires = this.acquires.filter((a) => a.id !== acquire.id);
        acquire.resolve(acquire.lock);
        InMemoryThrottlingLocksGenerator.locked = true;
      }
    }
  };

  acquire = (lockKey: string): Promise<IThrottlingLock> => {
    const memoryThrottlerLocksGenerator = getInMemoryLocksGenerator(lockKey);
    const memoryThrottlerLock = new InMemoryThrottlingLock();
    return new Promise((resolve) => {
      memoryThrottlerLocksGenerator.acquires.push({
        id: uuidv4(),
        lock: memoryThrottlerLock,
        resolve,
      });
    });
  };
}
