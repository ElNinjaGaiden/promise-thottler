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
import { InMemoryThrottlingQuotaTracker } from "../throttler.memory/memory.throttler.quota.tracker.ts";
import { RedisThrottlingLocksGenerator } from "../throttler.redis/redis.throttler.locker.ts";
import { RedisThrottlingQuotaTracker } from "../throttler.redis/redis.throttler.quota.tracker.ts";

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
          endpointsThrottlingConfig,
        );
        const { throttlingLocksGenerator, throttlingQuotaTracker } = this
          .getThrottlerMechanism(lockKey);
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
  ): IThrottlingMechanism => {
    const throttlingLocksGenerator: IThrottlingLocksGenerator =
      this.scalabilityAwareThottlingConfig.autoScaleEnabled
        ? new RedisThrottlingLocksGenerator()
        : new InMemoryThrottlingLocksGenerator(lockKey);
    const throttlingQuotaTracker: IThrottlingQuotaTracker =
      this.scalabilityAwareThottlingConfig.autoScaleEnabled
        ? new RedisThrottlingQuotaTracker()
        : new InMemoryThrottlingQuotaTracker();
    return {
      throttlingLocksGenerator,
      throttlingQuotaTracker,
    };
  };
}
