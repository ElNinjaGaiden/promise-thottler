import moment from "moment";

export interface PromiseThrottlerOptions {
  operationsPerMinute: number;
  retries: number;
}

export interface ScalabilityAwarePromiseThrottlerOptions
  extends PromiseThrottlerOptions {
  processors?: number;
  autoScaleEnabled: boolean;
}

export interface PromiseThrottlerOperationOptions<TError extends Error> {
  id?: string;
  retries?: number;
  onOperationRescheduled?: (
    scheduleTime: moment.Moment,
    operationId?: string,
  ) => Promise<void> | void;
  onOperationFailed?: (
    error: TError,
    operationId?: string,
  ) => Promise<void> | void;
  shouldRetry?: (
    error: TError,
    operationId?: string,
  ) => Promise<boolean> | boolean;
}

export interface PromiseThrottlerOperation<T, TError extends Error> {
  operation: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  // deno-lint-ignore no-explicit-any
  reject: (reason?: any) => void;
  currentRetryAttempt: number;
  options?: PromiseThrottlerOperationOptions<TError>;
}

export interface IPromiseThrottler {
  add: <T, TError extends Error>(
    operation: () => Promise<T>,
    options?: PromiseThrottlerOperationOptions<TError>,
  ) => Promise<T>;
}

export interface IPromiseThrottlerQuotaTracker {
  set: (
    key: string,
    value: string | number,
  ) => Promise<void>;
  get: (key: string) => Promise<number>;
}

export interface IPromiseThrottlerKeysGenerator {
  getLockKey: () => string;
  getCounterKey: (moment: moment.Moment) => string;
}

export interface IPromiseThrottlerLock {
  release: () => Promise<void>;
}

export interface IPromiseThrottlerLocksGenerator {
  acquire: (lockKey: string) => Promise<IPromiseThrottlerLock>;
}

export class PromiseThrottlerRetriesExaustedError extends Error {
}
