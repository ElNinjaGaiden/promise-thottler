import {
  EndpointsThrottlingConfig,
  IApiThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
} from "../promise.throttler.types.ts";
import { GetApiThrottlerFn } from "../test.ts";
import { RedisApiThrottler } from "./redis.throttler.api.ts";

export const getApiThrottler: GetApiThrottlerFn = <
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
>(
  endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
  throttlingKeysGeneratorInput: KeysGeneratorInput,
  throttlingKeysGenerator: IThrottlingKeysGenerator<
    KeysGeneratorInput
  >,
): IApiThrottler => {
  return new RedisApiThrottler<KeysGeneratorInput>(
    endpointsThrottlingConfigs,
    throttlingKeysGeneratorInput,
    throttlingKeysGenerator,
  );
};
