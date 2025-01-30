import { ApiThrottlerBase } from "../api.thottler.base.ts";
import { EndpointsThrottler } from "../promise.throttler.ts";
import {
  EndpointsThrottlingConfig,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
} from "../promise.throttler.types.ts";
import { InMemoryThrottlingLocksGenerator } from "./memory.throttler.locker.ts";
import { InMemoryListThrottlingQuotaTracker } from "./memory.list.throttler.quota.tracker.ts";

export class MemoryApiThrottler<
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
          new InMemoryListThrottlingQuotaTracker(),
        );
      });
  }
}
