import {
  EndpointsThrottlingConfig,
  IApiThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
} from "./promise.throttler.types.ts";
import moment from "moment";
import {
  atmsApisThrottlingConfigs,
  FAKE_OPERATION_DURATION_MILISECONDS,
  OPERATIONS_TO_TEST,
  VehicleCompanyAtmsApiEndpointConfig,
  WAIT_FOR_BRAND_NEW_MINUTE_TO_START,
} from "./throttler.config.ts";
import { AxiosError } from "axios";
import redis from "./redis.ts";
import { VehicleCompanyAtmsThrottlingKeysGenerator } from "./throttler.config.ts";

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

export type GetApiThrottlerFn = <
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
>(
  endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
  throttlingKeysGeneratorInput: KeysGeneratorInput,
  throttlingKeysGenerator: IThrottlingKeysGenerator<
    KeysGeneratorInput
  >,
) => IApiThrottler;

const operation = (atmskKey: string, url: string, index: string) => {
  return new Promise(function (resolve, _reject) {
    setTimeout(() => {
      console.log(
        `API operation ${index} completed at ${
          moment().format("HH:mm:ss")
        }. Url operation sent to ${atmskKey} - ${url}`,
      );
      resolve(index);
      // reject('Dummy error');
    }, FAKE_OPERATION_DURATION_MILISECONDS);
  });
};

const prepareOperations = (
  getApiThrottler: GetApiThrottlerFn,
) => {
  // deno-lint-ignore no-explicit-any
  const operations: Array<Promise<any>> = [];
  const throttlerKeysGenerator =
    new VehicleCompanyAtmsThrottlingKeysGenerator();
  OPERATIONS_TO_TEST.forEach((operationsPerAtms) => {
    const { atmsKey, vehicleCompanyId, operations: atmsOperationsGroups } =
      operationsPerAtms;
    const atmsEndpointsThrottlingConfigs = atmsApisThrottlingConfigs[atmsKey];
    const vehicleCompanyAtmsApiEndpointConfig:
      VehicleCompanyAtmsApiEndpointConfig = {
        atmsKey,
        vehicleCompanyId,
      };
    const apiThrottler = getApiThrottler(
      atmsEndpointsThrottlingConfigs,
      vehicleCompanyAtmsApiEndpointConfig,
      throttlerKeysGenerator,
    );
    for (let j = 0; j < atmsOperationsGroups.length; j++) {
      const operationsGroup = atmsOperationsGroups[j];
      for (let i = 1; i < operationsGroup.quantity + 1; i++) {
        // deno-lint-ignore no-explicit-any
        operations.push(apiThrottler.add<any, AxiosError>(
          operationsGroup.url,
          operation.bind(this, atmsKey, operationsGroup.url, i.toString()),
          {
            id: i.toString(),
            onOperationRescheduled: (
              scheduleTime: moment.Moment,
              url: string,
              id?: string,
            ) => {
              console.log(
                `Operation ${id} to be sent to ${atmsKey} - ${url} rescheduled to try to run at ${
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
            // onOperationAssignedToThrottler: (url, urlSpecification, _urlRegexExpression, _operationId) => {
            //   console.log(`Operation to be sent to ${url} assigned to throttler ${urlSpecification}`);
            // },
          },
        ));
      }
    }
  });

  return operations;
};

// deno-lint-ignore no-explicit-any
const doTest = async (operations: Array<Promise<any>>) => {
  const startTime = moment();
  const results = await Promise.allSettled(operations);
  const endTime = moment();
  const fulfilled = results.filter((p) => p.status === "fulfilled");
  const rejected = results.filter((p) => p.status === "rejected");
  console.log(
    `All operations completed, fulfilled: ${fulfilled.length}, rejected: ${rejected.length}, start time: ${
      startTime.format("HH:mm:ss")
    }, end time: ${endTime.format("HH:mm:ss")}`,
  );
  redis.disconnect();
  Deno.exit(0);
};

export const test = (
  getApiThrottler: GetApiThrottlerFn,
) => {
  const now = moment();
  const nextMinute = moment().add(1, "minutes").seconds(0);
  const wait = WAIT_FOR_BRAND_NEW_MINUTE_TO_START
    ? nextMinute.diff(now, "milliseconds")
    : 0;
  if (wait) {
    console.log(`Waiting until ${nextMinute.format("HH:mm")} to start...`);
  }
  setTimeout(async () => {
    const operations = prepareOperations(getApiThrottler);
    console.log(`Operations ready, ${operations.length} to execute.`);
    await doTest(operations);
  }, wait);
};
