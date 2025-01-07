import moment from "moment";

export interface PromiseThrottlerOptions {
  atmsKey: string;
  vehicleCompanyId?: number;
  operationsPerMinute: number;
  retries: number;
}

export interface PromiseThrottlerOperationOptions<TError extends Error> {
  id?: string;
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
  getLockKey: () => string;
  finish: () => void;
}

export interface IPromiseThrottlerQuotaTracker {
  set: (
    key: string,
    value: string | number,
    minutesTtl?: number,
  ) => Promise<void>;
  get: (key: string) => Promise<number>;
}

export interface IPromiseThrottlerLock {
  release: () => Promise<void>;
}

export interface IPromiseThrottlerLocker {
  acquire: (lockKey: string) => Promise<IPromiseThrottlerLock>;
}

export interface IPromiseThrottlerFinisher {
  finish: (lockKey: string) => void;
}

export class PromiseThrottlerRetriesExaustedError extends Error {
}
