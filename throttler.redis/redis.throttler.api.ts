import { ApiThrottlerBase } from "../api.thottler.base.ts";
import { EndpointsThrottler } from "../promise.throttler.ts";
import {
  EndpointsThrottlingConfig,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
} from "../promise.throttler.types.ts";
import { RedisThrottlingLocksGenerator } from "./redis.throttler.locker.ts";
import { RedisListThrottlingQuotaTracker } from "./redis.list.throttler.quota.tracker.ts";

export class RedisApiThrottler<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> extends ApiThrottlerBase<KeysGeneratorInput> {
  constructor(
    readonly endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
    readonly throttlingKeysGeneratorInput: KeysGeneratorInput,
    readonly throttlingKeysGenerator: IThrottlingKeysGenerator<
      KeysGeneratorInput
    >,
  ) {
    super(
      endpointsThrottlingConfigs,
      throttlingKeysGeneratorInput,
      throttlingKeysGenerator,
    );

    this.endpointsThrottlers = this.sortedEndpointsThrottlingConfigs
      .map((endpointsThrottlingConfig) => {
        return new EndpointsThrottler<KeysGeneratorInput>(
          endpointsThrottlingConfig,
          throttlingKeysGeneratorInput,
          throttlingKeysGenerator,
          new RedisThrottlingLocksGenerator(),
          new RedisListThrottlingQuotaTracker(),
        );
      });
  }
}
