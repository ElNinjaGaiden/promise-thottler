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

  static lockKeysTimePartsConfigs: Record<ThrottlerConfigUnitsOfTime, { end: number, pivotTimeFormat: string }> = {
    seconds: {
      end: 59,
      pivotTimeFormat: 'HH-mm'
    },
    minutes: {
      end: 59,
      pivotTimeFormat: 'HH'
    },
    hours: {
      end: 23,
      pivotTimeFormat: ''
    }
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

  private getLockKeyTimePart = (executionMoment: moment.Moment) => {
    const { timeSegmentsLength, unitOfTime } = this.throttlingOptions;
    const { end, pivotTimeFormat } = EndpointsThrottler.lockKeysTimePartsConfigs[unitOfTime];
    const allUnits = Array.from({ length: end + 1 }, (_, i) => i);
    const segments: Array<number[]> = [
      ...chunks(allUnits, timeSegmentsLength),
    ];
    const currentTimeSegment = executionMoment[unitOfTime]();
    const currentSegment = segments.find((s) => s.includes(currentTimeSegment));
    if (!currentSegment) {
      throw new Error(`Segment not found for unit of time: ${unitOfTime}, unit: ${currentTimeSegment}`);
    }
    return `${pivotTimeFormat ? `${executionMoment.format(pivotTimeFormat)}-`: ''}${
      this.getSegmentRepresentationForLockKey(currentSegment)
    }`;
  }

  /* The `getSegmentRepresentationForLockKey` function is responsible for generating a string
    representation of a segment of numbers for a lock key.
    For instance, if a throttler is using minutes as unit of time and it defines segments of 3 minutes
    a minute representation will be split into chunks of 5: [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], etc.
    If an operation is done in the minute 6 of a minute, it "belongs" to the segment [5, 6, 7, 8, 9]
    This function generates "[5...9]" for that segment as part of a lock key
  */
  private getSegmentRepresentationForLockKey = (segment: number[]) => {
    return `[${
      segment.length === 1
        ? `${segment[0].toString().padStart(2, "0")}`
        : `${segment[0].toString().padStart(2, "0")}...${
          segment[segment.length - 1].toString().padStart(2, "0")
        }`
    }]`;
  };

  // getLockKeyTimePart = (executionMoment: moment.Moment) => {
  //   const { unitOfTime } = this.throttlingOptions;
  //   let timeWindowKeyPart = "";
  //   switch (unitOfTime) {
  //     case "seconds": {
  //       // const end = 59;
  //       // const allUnits = Array.from({ length: end + 1 }, (_, i) => i);
  //       // const segments: Array<number[]> = [
  //       //   ...chunks(allUnits, unitsOfTimePerSegment),
  //       // ];
  //       // const currentSecond = executionMoment.seconds();
  //       // const currentSegment = segments.find((s) => s.includes(currentSecond));
  //       // if (!currentSegment) {
  //       //   throw new Error(`Segment not found for unit of time: ${this.throttlingOptions.unitOfTime}, unit: ${currentSecond}`);
  //       // }
  //       // timeWindowKeyPart = `${executionMoment.format("HH-mm")}-${
  //       //   this.getSegmentRepresentationForLockKey(currentSegment)
  //       // }`;
  //       timeWindowKeyPart = this.notAGoodNameYet(59, executionMoment, "HH-mm");
  //       break;
  //     }
  //     case "minutes": {
  //       // const end = 59;
  //       // const allUnits = Array.from({ length: end + 1 }, (_, i) => i);
  //       // const segments: Array<number[]> = [
  //       //   ...chunks(allUnits, unitsOfTimePerSegment),
  //       // ];
  //       // const currentMinute = executionMoment.minutes();
  //       // const currentSegment = segments.find((s) => s.includes(currentMinute));
  //       // if (!currentSegment) {
  //       //   throw new Error(`Segment not found for unit of time: ${this.throttlingOptions.unitOfTime}, unit: ${currentMinute}`);
  //       // }
  //       // timeWindowKeyPart = `${executionMoment.format("HH")}-${
  //       //   this.getSegmentRepresentationForLockKey(currentSegment)
  //       // }`;
  //       timeWindowKeyPart = this.notAGoodNameYet(59, executionMoment, "HH");
  //       break;
  //     }
  //     case "hours": {
  //       throw new Error("Under construction");
  //       break;
  //     }
  //     default:
  //       throw new Error(`Invalid unit of time: ${unitOfTime}`);
  //   }
  //   return timeWindowKeyPart;
  // };

  getCounterKey = (executionMoment: moment.Moment) => {
    return `${
      this.throttlingKeysGenerator.getCounterKey(
        this.throttlingKeysGeneratorInput,
        this.throttlingOptions,
      )
    }${this.getLockKeyTimePart(executionMoment)}`;
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

  private doDequeue = async () => {
    const candidate = this.operations.shift();
    if (candidate) {
      const lockKey = this.throttlingKeysGenerator.getLockKey(
        this.throttlingKeysGeneratorInput,
        this.throttlingOptions,
      );
      const lock = await this.throttlingLocksGenerator.acquire(lockKey);
      const executionMoment = moment();
      const currentCounterKey = this.getCounterKey(executionMoment);
      const currentOperationsCounter = await this.throttlingQuotaTracker
        .get(currentCounterKey);
      const { url, operation, resolve, reject, options: operationOptions } =
        candidate;
      if (
        currentOperationsCounter <
          this.throttlingOptions.operationsPerTimeSegment
      ) {
        // Rate limit has not been executed, we can proceed
        try {
          const returnValue = await operation(url);
          await this.throttlingQuotaTracker.set(
            currentCounterKey,
            currentOperationsCounter + 1,
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
    const retries = operationOptions?.retries ?? this.throttlingOptions.retries;
    if (currentRetryAttempt <= retries + 1) {
      const nextTimeWindow = moment().add(
        this.throttlingOptions.timeSegmentsLength,
        this.throttlingOptions.unitOfTime,
      ); // .seconds(0)
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
}
