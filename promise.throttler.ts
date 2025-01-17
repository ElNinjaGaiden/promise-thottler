import {
  EndpointsThrottlingConfig,
  IEndpointsThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  IThrottlingLocksGenerator,
  IThrottlingQuotaTracker,
  ThrottlingOperation,
  ThrottlingOperationOptions,
  ThrottlingRetriesExaustedError,
} from "./promise.throttler.types.ts";
import moment from "moment";

export class EndpointsThrottler<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> implements IEndpointsThrottler {
  // deno-lint-ignore no-explicit-any
  private operations: Array<ThrottlingOperation<any, any>> = [];

  constructor(
    readonly throttlingOptions: EndpointsThrottlingConfig,
    readonly throttlingKeysGeneratorInput: KeysGeneratorInput,
    readonly throttlingKeysGenerator: IThrottlingKeysGenerator<
      KeysGeneratorInput
    >,
    readonly throttlingLocksGenerator: IThrottlingLocksGenerator,
    readonly throttlingQuotaTracker: IThrottlingQuotaTracker,
  ) {}

  get urlRegexExpression(): string {
    return this.throttlingOptions.urlRegexExpression;
  }

  get urlRegexFlags(): string {
    return this.throttlingOptions.urlRegexFlags;
  }

  add = <T, TError extends Error>(
    url: string,
    operation: (url: string) => Promise<T>,
    options?: ThrottlingOperationOptions<TError>,
  ): Promise<T> => {
    const p = new Promise<T>((resolve, reject) => {
      this.operations.push({
        url,
        operation,
        resolve,
        reject,
        currentRetryAttempt: 1,
        options,
      });
      this.doDequeue();
    });
    return p;
  };

  private doDequeue = async () => {
    const candidate = this.operations.shift();
    if (candidate) {
      const lockKey = this.throttlingKeysGenerator.getLockKey(
        this.throttlingKeysGeneratorInput,
        this.throttlingOptions,
      );
      const lock = await this.throttlingLocksGenerator.acquire(lockKey);
      const executionMoment = moment();
      const currentCounterKey = this.throttlingKeysGenerator.getCounterKey(
        this.throttlingKeysGeneratorInput,
        this.throttlingOptions,
        executionMoment,
      );
      const currentMinuteOperationsCounter = await this.throttlingQuotaTracker
        .get(currentCounterKey);
      const { url, operation, resolve, reject, options: operationOptions } =
        candidate;
      if (
        currentMinuteOperationsCounter <
          this.throttlingOptions.operationsPerMinute
      ) {
        // Rate limit has not been executed, we can proceed
        try {
          const returnValue = await operation(url);
          await this.throttlingQuotaTracker.set(
            currentCounterKey,
            currentMinuteOperationsCounter + 1,
          );
          await lock.release();
          resolve(returnValue);
        } catch (error: unknown) {
          if (operationOptions?.onOperationFailed) {
            operationOptions.onOperationFailed(error, url, operationOptions.id);
          }
          // Check if the operation has to be retried
          const shouldRetry = operationOptions?.shouldRetry
            ? await operationOptions.shouldRetry(error)
            : true;
          await lock.release();
          if (shouldRetry) {
            const nextMinute = moment().add(1, "minutes").seconds(0);
            candidate.currentRetryAttempt += 1;
            this.tryEnqueueOperation(candidate, executionMoment, nextMinute);
          } else {
            // Operation does not has to be retried, reject it
            reject(error);
          }
        }
      } else {
        // Rate limit has been reached, we need reschedule the operation for the next quota time window (next minute)
        await lock.release();
        const nextMinute = moment().add(1, "minutes").seconds(0);
        this.tryEnqueueOperation(candidate, executionMoment, nextMinute);
      }
    }
  };

  private tryEnqueueOperation = <T, TError extends Error>(
    operation: ThrottlingOperation<T, TError>,
    previousAttemptMoment: moment.Moment,
    executionMoment: moment.Moment,
  ) => {
    // Note: "retries + 1" to actually make the initial attempt and then the N available retries
    const { currentRetryAttempt, url, options: operationOptions } = operation;
    const retries = operationOptions?.retries ?? this.throttlingOptions.retries;
    if (currentRetryAttempt <= retries + 1) {
      if (operationOptions?.onOperationRescheduled) {
        operationOptions.onOperationRescheduled(
          executionMoment,
          url,
          operationOptions.id,
        );
      }
      setTimeout(() => {
        this.operations.unshift(operation);
        this.doDequeue();
      }, executionMoment.diff(previousAttemptMoment, "milliseconds"));
    } else {
      operation.reject(
        new ThrottlingRetriesExaustedError(
          `Operation ${
            operationOptions?.id ? `${operationOptions.id} ` : ""
          } has been aborted since it did not complete succesfully after ${retries} retries`,
        ),
      );
    }
  };
}
