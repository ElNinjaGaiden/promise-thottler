import moment from "moment";

export interface EndpointsThrottlingConfig {
  urlSpecification: string;
  urlRegexExpression: string;
  urlRegexFlags: string;
  matchingPrecedence: number;
  operationsPerMinute: number;
  retries: number;
}

export interface ScalabilityAwareApiThrottlingConfig {
  processors?: number;
  autoScaleEnabled: boolean;
}

export interface ThrottlingOperationOptions<TError extends Error> {
  id?: string;
  retries?: number;
  onOperationRescheduled?: (
    scheduleTime: moment.Moment,
    url: string,
    operationId?: string,
  ) => Promise<void> | void;
  onOperationFailed?: (
    error: TError,
    url: string,
    operationId?: string,
  ) => Promise<void> | void;
  shouldRetry?: (
    error: TError,
    operationId?: string,
  ) => Promise<boolean> | boolean;
}

export interface ThrottlingOperation<T, TError extends Error> {
  url: string;
  operation: (url: string) => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  // deno-lint-ignore no-explicit-any
  reject: (reason?: any) => void;
  currentRetryAttempt: number;
  options?: ThrottlingOperationOptions<TError>;
}

export interface IEndpointsThrottler {
  get throttlingOptions(): EndpointsThrottlingConfig;
  add: <T, TError extends Error>(
    url: string,
    operation: (url: string) => Promise<T>,
    options?: ThrottlingOperationOptions<TError>,
  ) => Promise<T>;
}

export interface IApiThrottler {
  add: <T, TError extends Error>(
    url: string,
    operation: (url: string) => Promise<T>,
    options?: ThrottlingOperationOptions<TError>,
  ) => Promise<T>;
}

export interface IThrottlingQuotaTracker {
  set: (
    key: string,
    value: string | number,
  ) => Promise<void>;
  get: (key: string) => Promise<number>;
}

// deno-lint-ignore no-empty-interface
export interface IThrottlingKeysGeneratorInput {}

export interface IThrottlingKeysGenerator<
  T extends IThrottlingKeysGeneratorInput,
> {
  getLockKey: (input: T, throttlerConfig: EndpointsThrottlingConfig) => string;
  getCounterKey: (input: T, throttlerConfig: EndpointsThrottlingConfig, moment: moment.Moment) => string;
}

export interface IThrottlingLock {
  release: () => Promise<void>;
}

export interface IThrottlingLocksGenerator {
  acquire: (lockKey: string) => Promise<IThrottlingLock>;
}

export class ThrottlingRetriesExaustedError extends Error {
}
