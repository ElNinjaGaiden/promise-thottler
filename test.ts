import { IPromiseThrottler } from "./promise.throttler.types.ts";
import moment from "moment";
import { NUMBER_OF_OPERATIONS } from "./throttler.config.ts";
import { AxiosError } from "axios";
import redis from "./redis.ts";

export const NETWORK_ERROR_CODES = [
  "EPIPE",
  "EPROTO",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ECONNREFUSED",
  // "ERR_BAD_REQUEST",
];

export const test = async (throttler: IPromiseThrottler) => {
  const operation = (index: string) => {
    return new Promise(function (resolve, _reject) {
      setTimeout(() => {
        console.log(
          `API operation ${index} completed at ${moment().format("HH:mm:ss")}`,
        );
        resolve(index);
        // reject('Dummy error');
      }, 500);
    });
  };

  const operations = [];
  for (let i = 1; i < NUMBER_OF_OPERATIONS + 1; i++) {
    operations.push(
      // deno-lint-ignore no-explicit-any
      throttler.add<any, AxiosError>(operation.bind(this, i.toString()), {
        id: i.toString(),
        onOperationRescheduled: (scheduleTime: moment.Moment, id?: string) => {
          console.log(
            `Operation ${id} rescheduled to try to run at ${
              scheduleTime.format("HH:mm:ss")
            }`,
          );
        },
        onOperationFailed: (error, id) => {
          console.log(`Operation ${id} failed. Error: ${error.message}`);
        },
        shouldRetry: (e) => {
          const errorCode = e?.code;
          if (errorCode && NETWORK_ERROR_CODES.includes(errorCode)) {
            return true; // network errors
          }
          const status = e?.response?.status;
          if (!status || status <= 499) return false; // data errors
          return true;
        },
      }),
    );
  }

  const results = await Promise.allSettled(operations);
  const fulfilled = results.filter((p) => p.status === "fulfilled");
  const rejected = results.filter((p) => p.status === "rejected");
  console.log(
    `All operations completed, fulfilled: ${fulfilled.length}, rejected: ${rejected.length}`,
  );
  redis.disconnect();
  Deno.exit(0);
};
