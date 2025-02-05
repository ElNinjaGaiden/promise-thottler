import { IThrottlingLock } from "./promise.throttler.types.ts";
import {
  EndpointsThrottlingConfig,
  IEndpointsThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  IThrottlingLocksGenerator,
  IThrottlingQuotaTracker,
  ThrottlerConfigUnitsOfTime,
  ThrottlingOperation,
  ThrottlingOperationOptions,
  ThrottlingRetriesExaustedError,
} from "./promise.throttler.types.ts";
import moment from "moment";

function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}

export class EndpointsThrottler<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> implements IEndpointsThrottler {
  // deno-lint-ignore no-explicit-any
  private operations: Array<ThrottlingOperation<any, any>> = [];

  static lockKeysTimePartsConfigs: Record<
    ThrottlerConfigUnitsOfTime,
    { end: number; pivotTimeFormat: string }
  > = {
    seconds: {
      end: 59,
      pivotTimeFormat: "HH-mm",
    },
    minutes: {
      end: 59,
      pivotTimeFormat: "HH",
    },
    hours: {
      end: 23,
      pivotTimeFormat: "",
    },
  };

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

  private getCurrentTimePeriod = (executionMoment: moment.Moment) => {
    const { periodsLength, unitOfTime } = this.throttlingOptions;
    const { end } = EndpointsThrottler.lockKeysTimePartsConfigs[unitOfTime];
    const allUnits = Array.from({ length: end + 1 }, (_, i) => i);
    const periods: Array<number[]> = [
      ...chunks(allUnits, periodsLength),
    ];
    const currentTimePeriod = executionMoment[unitOfTime]();
    const currentPeriod = periods.find((s) => s.includes(currentTimePeriod));
    if (!currentPeriod) {
      throw new Error(
        `Period not found for unit of time: ${unitOfTime}, unit: ${currentTimePeriod}`,
      );
    }
    return currentPeriod;
  };

  private getNextTimePeriod = (executionMoment: moment.Moment): number[] => {
    const { periodsLength, unitOfTime } = this.throttlingOptions;
    const { end } = EndpointsThrottler.lockKeysTimePartsConfigs[unitOfTime];
    const allUnits = Array.from({ length: end + 1 }, (_, i) => i);
    const periods: Array<number[]> = [
      ...chunks(allUnits, periodsLength),
    ];
    const currentTimePeriod = executionMoment[unitOfTime]();
    const currentPeriodIndex = periods.findIndex((s) =>
      s.includes(currentTimePeriod)
    );
    return currentPeriodIndex === periods.length - 1
      ? periods[0]
      : periods[currentPeriodIndex + 1];
  };

  private getLockKeyTimePart = (executionMoment: moment.Moment) => {
    const { unitOfTime } = this.throttlingOptions;
    const currentPeriod = this.getCurrentTimePeriod(executionMoment);
    const { pivotTimeFormat } =
      EndpointsThrottler.lockKeysTimePartsConfigs[unitOfTime];
    return `${
      pivotTimeFormat ? `${executionMoment.format(pivotTimeFormat)}-` : ""
    }${this.getPeriodRepresentationForLockKey(currentPeriod)}`;
  };

  /* The `getPeriodRepresentationForLockKey` function is responsible for generating a string
    representation of a periods of numbers for a lock key.
    For instance, if a throttler is using minutes as unit of time and it defines periods of 3 minutes
    a minute representation will be split into chunks of 5: [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], etc.
    If an operation is done in the minute 6 of a minute, it "belongs" to the period [5, 6, 7, 8, 9]
    This function generates "[5...9]" for that period as part of a lock key
  */
  private getPeriodRepresentationForLockKey = (period: number[]) => {
    return `[${
      period.length === 1
        ? `${period[0].toString().padStart(2, "0")}`
        : `${period[0].toString().padStart(2, "0")}...${
          period[period.length - 1].toString().padStart(2, "0")
        }`
    }]`;
  };

  getCounterKey = (executionMoment: moment.Moment) => {
    const { urlSpecification } = this.throttlingOptions;
    return `${
      this.throttlingKeysGenerator.getCounterKey(
        this.throttlingKeysGeneratorInput,
      )
    }:${urlSpecification}:${this.getLockKeyTimePart(executionMoment)}`;
  };

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

  private async acquireLock(): Promise<IThrottlingLock> {
    const { enabled, urlSpecification } = this.throttlingOptions;
    if (enabled) {
      const lockKey = `${
        this.throttlingKeysGenerator.getLockKey(
          this.throttlingKeysGeneratorInput,
        )
      }:${urlSpecification}:lock`;
      return await this.throttlingLocksGenerator.acquire(lockKey);
    }
    // Throttling disabled, return fake lock
    return Promise.resolve({
      release: () => Promise.resolve(),
    });
  }

  private async canProceed(executionMoment: moment.Moment): Promise<boolean> {
    const { enabled, operationsPerPeriod } = this.throttlingOptions;
    if (enabled) {
      const currentCounterKey = this.getCounterKey(executionMoment);
      const currentQuotaConsumed = await this.throttlingQuotaTracker.current(
        currentCounterKey,
      );
      return currentQuotaConsumed < operationsPerPeriod;
    }
    // Throttling disabled, return true as always can proceed
    return true;
  }

  private doDequeue = async () => {
    const candidate = this.operations.shift();
    if (candidate) {
      const lock = await this.acquireLock();
      const executionMoment = moment();
      const { url, operation, resolve, reject, options: operationOptions } =
        candidate;
      const canProceed = await this.canProceed(executionMoment);
      if (
        canProceed || !this.throttlingOptions.enabled
      ) {
        // Rate limit has not been executed, we can proceed
        try {
          const returnValue = await operation(url);
          await this.throttlingQuotaTracker.add(
            this.getCounterKey(executionMoment),
            candidate,
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
            candidate.currentRetryAttempt += 1;
            this.tryEnqueueOperation(candidate, executionMoment);
          } else {
            // Operation does not has to be retried, reject it
            reject(error);
          }
        }
      } else {
        // Rate limit has been reached, we need reschedule the operation for the next quota time window
        await lock.release();
        this.tryEnqueueOperation(candidate, executionMoment);
      }
    }
  };

  private tryEnqueueOperation = <T, TError extends Error>(
    operation: ThrottlingOperation<T, TError>,
    previousAttemptMoment: moment.Moment,
  ) => {
    // Note: "retries + 1" to actually make the initial attempt and then the N available retries
    const { currentRetryAttempt, url, options: operationOptions } = operation;
    const { retries: defaultRetries } = this.throttlingOptions;
    const retries = operationOptions?.retries ?? defaultRetries;
    if (currentRetryAttempt <= retries + 1) {
      const nextTimeWindow = this.getNextTimeWindow(previousAttemptMoment);
      if (operationOptions?.onOperationRescheduled) {
        operationOptions.onOperationRescheduled(
          nextTimeWindow,
          url,
          operationOptions.id,
        );
      }
      setTimeout(() => {
        this.operations.unshift(operation);
        this.doDequeue();
      }, nextTimeWindow.diff(previousAttemptMoment, "milliseconds"));
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

  private getNextTimeWindow = (
    previousAttemptMoment: moment.Moment,
  ): moment.Moment => {
    const { periodsLength, unitOfTime, quotaTrackingStrategy } =
      this.throttlingOptions;
    const nextTimeWindow = moment().add(
      periodsLength,
      unitOfTime,
    );
    if (quotaTrackingStrategy === "rolling") {
      return nextTimeWindow;
    }
    // Quota tracking strategy is "strict_buckets"
    switch (unitOfTime) {
      case "seconds":
        return nextTimeWindow.seconds(
          this.getNextTimePeriod(previousAttemptMoment)[0],
        );
      case "minutes":
        return nextTimeWindow.seconds(0);
      case "hours":
        return nextTimeWindow.minutes(0).seconds(0);
    }
  };
}
