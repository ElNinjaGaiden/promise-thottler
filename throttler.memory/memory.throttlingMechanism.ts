import { GetApiThrottlerFn } from "../test.ts";
import { MemoryApiThrottler } from "./memory.throttler.api.ts";
import {
  EndpointsThrottlingConfig,
  IApiThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
} from "../promise.throttler.types.ts";

export const getApiThrottler: GetApiThrottlerFn = <
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
>(
  endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
  throttlingKeysGeneratorInput: KeysGeneratorInput,
  throttlingKeysGenerator: IThrottlingKeysGenerator<
    KeysGeneratorInput
  >,
): IApiThrottler => {
  return new MemoryApiThrottler<KeysGeneratorInput>(
    endpointsThrottlingConfigs,
    throttlingKeysGeneratorInput,
    throttlingKeysGenerator,
  );
};
