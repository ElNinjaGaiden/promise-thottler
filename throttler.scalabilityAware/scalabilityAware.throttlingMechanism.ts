import { scalabilityAwareThottlingConfig } from "../throttler.config.ts";
import {
  EndpointsThrottlingConfig,
  IApiThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
} from "../promise.throttler.types.ts";
import { GetApiThrottlerFn } from "../test.ts";
import { ScalabilityAwareApiThrottler } from "./scalabilityAware.api.thottler.ts";

export const getApiThrottler: GetApiThrottlerFn = <
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
>(
  endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
  throttlingKeysGeneratorInput: KeysGeneratorInput,
  throttlingKeysGenerator: IThrottlingKeysGenerator<
    KeysGeneratorInput
  >,
): IApiThrottler => {
  return new ScalabilityAwareApiThrottler<KeysGeneratorInput>(
    endpointsThrottlingConfigs,
    scalabilityAwareThottlingConfig,
    throttlingKeysGeneratorInput,
    throttlingKeysGenerator,
  );
};
