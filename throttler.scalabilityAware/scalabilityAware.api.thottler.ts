import { ApiThrottlerBase } from "../api.thottler.base.ts";
import { EndpointsThrottler } from "../promise.throttler.ts";
import {
  EndpointsThrottlingConfig,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  IThrottlingLocksGenerator,
  IThrottlingQuotaTracker,
  ScalabilityAwareApiThrottlingConfig,
} from "../promise.throttler.types.ts";
import { InMemoryThrottlingLocksGenerator } from "../throttler.memory/memory.throttler.locker.ts";
import { InMemoryListThrottlingQuotaTracker } from "../throttler.memory/memory.list.throttler.quota.tracker.ts";
import { RedisThrottlingLocksGenerator } from "../throttler.redis/redis.throttler.locker.ts";
import { RedisListThrottlingQuotaTracker } from "../throttler.redis/redis.list.throttler.quota.tracker.ts";
import { RedisCounterThrottlingQuotaTracker } from "../throttler.redis/redis.counter.throttler.quota.tracker.ts";
import { InMemoryCounterThrottlingQuotaTracker } from "../throttler.memory/memory.counter.throttler.quota.tracker.ts";

interface IThrottlingMechanism {
  throttlingLocksGenerator: IThrottlingLocksGenerator;
  throttlingQuotaTracker: IThrottlingQuotaTracker;
}

export class ScalabilityAwareApiThrottler<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> extends ApiThrottlerBase<KeysGeneratorInput> {
  constructor(
    readonly endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
    readonly scalabilityAwareThottlingConfig:
      ScalabilityAwareApiThrottlingConfig,
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
    const { autoScaleEnabled, processors } =
      this.scalabilityAwareThottlingConfig;
    const autoScalabilityDisabledCorrectly = autoScaleEnabled === false &&
      processors !== undefined && processors >= 1;

    if (autoScaleEnabled === false && !autoScalabilityDisabledCorrectly) {
      throw new Error(
        "If autoScaleEnabled is set to false, static processors number needs to be provided",
      );
    }

    this.endpointsThrottlers = this.sortedEndpointsThrottlingConfigs
      .map((endpointsThrottlingConfig) => {
        const operationsPerPeriod = autoScaleEnabled === false &&
            autoScalabilityDisabledCorrectly
          ? (Math.floor(
            endpointsThrottlingConfig.operationsPerPeriod /
              (scalabilityAwareThottlingConfig.processors ?? 1),
          ) || 1)
          : endpointsThrottlingConfig.operationsPerPeriod;
        const lockKey = throttlingKeysGenerator.getLockKey(
          throttlingKeysGeneratorInput,
        );
        const { throttlingLocksGenerator, throttlingQuotaTracker } = this
          .getThrottlerMechanism(lockKey, endpointsThrottlingConfig);
        return new EndpointsThrottler<KeysGeneratorInput>(
          {
            ...endpointsThrottlingConfig,
            operationsPerPeriod,
          },
          throttlingKeysGeneratorInput,
          throttlingKeysGenerator,
          throttlingLocksGenerator,
          throttlingQuotaTracker,
        );
      });
  }

  getThrottlerMechanism = (
    lockKey: string,
    endpointsThrottlingConfig: EndpointsThrottlingConfig,
  ): IThrottlingMechanism => {
    const { persistenceStrategy } = endpointsThrottlingConfig;
    const throttlingLocksGenerator: IThrottlingLocksGenerator =
      this.scalabilityAwareThottlingConfig.autoScaleEnabled
        ? new RedisThrottlingLocksGenerator()
        : new InMemoryThrottlingLocksGenerator(lockKey);
    const throttlingQuotaTracker: IThrottlingQuotaTracker =
      this.scalabilityAwareThottlingConfig.autoScaleEnabled
        ? (persistenceStrategy === "detailed"
          ? new RedisListThrottlingQuotaTracker()
          : new RedisCounterThrottlingQuotaTracker())
        : (persistenceStrategy === "detailed"
          ? new InMemoryListThrottlingQuotaTracker()
          : new InMemoryCounterThrottlingQuotaTracker());
    return {
      throttlingLocksGenerator,
      throttlingQuotaTracker,
    };
  };
}
