import { EndpointsThrottlerBase } from "./promise.throttler.base.ts";
import {
  IEndpointsThrottler,
  IThrottlingKeysGeneratorInput,
} from "./promise.throttler.types.ts";
import moment from "moment";

export class EndpointsThrottlerWithParallelism<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> extends EndpointsThrottlerBase<KeysGeneratorInput>
  implements IEndpointsThrottler {
  protected doDequeue = async () => {
    const candidate = this.operations.shift();
    if (candidate) {
      const {
        arrivedAt,
        url,
        operation,
        resolve,
        reject,
        options: operationOptions,
      } = candidate;
      const operationTimestamp = arrivedAt.getTime();
      const lock = await this.acquireLock(operationTimestamp);
      const executionMoment = moment();
      const canProceed = await this.canProceed(executionMoment);
      if (
        canProceed || !this.throttlingOptions.enabled
      ) {
        // Rate limit has not been executed, we can proceed
        try {
          // We assume the operation will be successful hence we consume the quota
          candidate.executedAt = new Date();
          await this.throttlingQuotaTracker.add(
            this.getCounterKey(executionMoment),
            candidate,
          );
          await lock.release();
          const returnValue = await operation(url);
          resolve(returnValue);
        } catch (error: unknown) {
          try {
            // Since the operation failed, we need to "return" the quota we assumed it would consume
            // NOTE: we pass 0 as timestamp as a trick in order to prioritize this lock
            const lock = await this.acquireLock(0);
            await this.throttlingQuotaTracker.substract(
              this.getCounterKey(executionMoment),
              candidate,
            );
            await lock.release();
            candidate.executedAt = undefined;
            //
          } catch (err) {
            console.error("Error substracting failed operation", err);
          }
          // Rest of the error handling...
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
}
