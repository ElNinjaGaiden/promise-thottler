import { ApiThrottlerBase } from "../api.thottler.base.ts";
import { EndpointsThrottler } from "../promise.throttler.ts";
import {
  EndpointsThrottlingConfig,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
} from "../promise.throttler.types.ts";
import { InMemoryThrottlingLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";
import { RedisListThrottlingQuotaTracker } from "../throttler.redis/redis.list.throttler.quota.tracker.ts";

export class HybridApiThrottler<
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
        const lockKey = throttlingKeysGenerator.getLockKey(
          throttlingKeysGeneratorInput,
          endpointsThrottlingConfig,
        );
        return new EndpointsThrottler<KeysGeneratorInput>(
          endpointsThrottlingConfig,
          throttlingKeysGeneratorInput,
          throttlingKeysGenerator,
          new InMemoryThrottlingLocksGenerator(lockKey),
          new RedisListThrottlingQuotaTracker(),
        );
      });
  }
}
