import {
  IPromiseThrottler,
  IPromiseThrottlerKeysGenerator,
  IPromiseThrottlerLocksGenerator,
  IPromiseThrottlerQuotaTracker,
  PromiseThrottlerOperation,
  PromiseThrottlerOperationOptions,
  PromiseThrottlerOptions,
  PromiseThrottlerRetriesExaustedError,
} from "./promise.throttler.types.ts";
import moment from "moment";

export class PromiseThrottler implements IPromiseThrottler {
  // deno-lint-ignore no-explicit-any
  static operations: Array<PromiseThrottlerOperation<any, any>> = [];

  constructor(
    readonly throttlingOptions: PromiseThrottlerOptions,
    readonly throttlerKeysGenerator: IPromiseThrottlerKeysGenerator,
    readonly throttlerLocksGenerator: IPromiseThrottlerLocksGenerator,
    readonly throttlerQuotaTracker: IPromiseThrottlerQuotaTracker,
  ) {}

  getLockKey = () => this.throttlerKeysGenerator.getLockKey();

  add = <T, TError extends Error>(
    operation: () => Promise<T>,
    options?: PromiseThrottlerOperationOptions<TError>,
  ): Promise<T> => {
    const p = new Promise<T>((resolve, reject) => {
      PromiseThrottler.operations.push({
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
    const candidate = PromiseThrottler.operations.shift();
    if (candidate) {
      const lock = await this.throttlerLocksGenerator.acquire(
        this.getLockKey(),
      );
      const executionMoment = moment();
      const currentCounterKey = this.throttlerKeysGenerator.getCounterKey(
        executionMoment,
      );
      const currentMinuteOperationsCounter = await this.throttlerQuotaTracker
        .get(currentCounterKey);
      const { operation, resolve, reject, options: operationOptions } =
        candidate;
      if (
        currentMinuteOperationsCounter <
          this.throttlingOptions.operationsPerMinute
      ) {
        // Rate limit has not been executed, we can proceed
        try {
          const returnValue = await operation();
          await this.throttlerQuotaTracker.set(
            currentCounterKey,
            currentMinuteOperationsCounter + 1,
          );
          await lock.release();
          resolve(returnValue);
        } catch (error: unknown) {
          if (operationOptions?.onOperationFailed) {
            operationOptions.onOperationFailed(error, operationOptions.id);
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
    operation: PromiseThrottlerOperation<T, TError>,
    previousAttemptMoment: moment.Moment,
    executionMoment: moment.Moment,
  ) => {
    // Note: "retries + 1" to actually make the initial attempt and then the N available retries
    const { currentRetryAttempt, options: operationOptions } = operation;
    const retries = operationOptions?.retries ?? this.throttlingOptions.retries;
    if (currentRetryAttempt <= retries + 1) {
      if (operationOptions?.onOperationRescheduled) {
        operationOptions.onOperationRescheduled(
          executionMoment,
          operationOptions.id,
        );
      }
      setTimeout(() => {
        PromiseThrottler.operations.unshift(operation);
        this.doDequeue();
      }, executionMoment.diff(previousAttemptMoment, "milliseconds"));
    } else {
      operation.reject(
        new PromiseThrottlerRetriesExaustedError(
          `Operation ${
            operationOptions?.id ? `${operationOptions.id} ` : ""
          } has been aborted since it did not complete succesfully after ${retries} retries`,
        ),
      );
    }
  };
}
