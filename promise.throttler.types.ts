import moment from "moment";

export type ThrottlerConfigUnitsOfTime = "seconds" | "minutes" | "hours";
export type ThrottlingQuotaTrackingStrategy = "strict_buckets" | "rolling";
export type ThrottlingQuotaTrackingPersistenceStrategy = "simple" | "detailed";

export interface EndpointsThrottlingConfig {
  urlSpecification: string;
  urlRegexExpression: string;
  urlRegexFlags: string;
  matchingPrecedence: number;
  operationsPerPeriod: number;
  unitOfTime: ThrottlerConfigUnitsOfTime;
  periodsLength: number;
  retries: number;
  strategy: ThrottlingQuotaTrackingStrategy;
  persistenceStrategy: ThrottlingQuotaTrackingPersistenceStrategy;
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

export interface ThrottlingOperationTrack {
  url: string;
  timestamp: string;
  id?: string;
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
  add: (
    key: string,
    // deno-lint-ignore no-explicit-any
    operation: ThrottlingOperation<any, any>,
  ) => Promise<void>;
  // get: (key: string, throttlerConfig: EndpointsThrottlingConfig) => Promise<number>;
  canProceed: (
    key: string,
    throttlerConfig: EndpointsThrottlingConfig,
  ) => Promise<boolean>;
}

// deno-lint-ignore no-empty-interface
export interface IThrottlingKeysGeneratorInput {}

export interface IThrottlingKeysGenerator<
  T extends IThrottlingKeysGeneratorInput,
> {
  getLockKey: (input: T, throttlerConfig: EndpointsThrottlingConfig) => string;
  getCounterKey: (
    input: T,
    throttlerConfig: EndpointsThrottlingConfig,
  ) => string;
}

export interface IThrottlingLock {
  release: () => Promise<void>;
}

export interface IThrottlingLocksGenerator {
  acquire: (lockKey: string) => Promise<IThrottlingLock>;
}

export class ThrottlingRetriesExaustedError extends Error {
}
