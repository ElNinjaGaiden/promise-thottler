import { EndpointsThrottler } from "./promise.throttler.ts";
import {
  EndpointsThrottlingConfig,
  IApiThrottler,
  IEndpointsThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  ScalabilityAwareApiThrottlingConfig,
  ThrottlingOperationOptions,
} from "./promise.throttler.types.ts";
import { IThrottlingMechanism } from "./test.ts";

export class ApiThrottler<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> implements IApiThrottler {
  private readonly endpointsThrottlers: IEndpointsThrottler[] = [];

  constructor(
    readonly endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
    readonly scalabilityAwareThottlingConfig:
      ScalabilityAwareApiThrottlingConfig,
    readonly throttlingKeysGeneratorInput: KeysGeneratorInput,
    readonly throttlingKeysGenerator: IThrottlingKeysGenerator<
      KeysGeneratorInput
    >,
    readonly getThrottlingMechanism: (lockKey: string) => IThrottlingMechanism,
  ) {
    const { autoScaleEnabled, processors } =
      this.scalabilityAwareThottlingConfig;
    const autoScalabilityDisabledCorrectly = autoScaleEnabled === false &&
      processors && processors >= 1;
    if (autoScaleEnabled === false && !autoScalabilityDisabledCorrectly) {
      throw new Error(
        "If autoScaleEnabled is set to false, static processors number needs to be provided",
      );
    }
    this.endpointsThrottlers = endpointsThrottlingConfigs
      .sort((a, b) => a.matchingPrecedence - b.matchingPrecedence)
      .map((endpointsThrottlingConfig) => {
        const operationsPerMinute = autoScaleEnabled === false &&
            autoScalabilityDisabledCorrectly
          ? (Math.floor(
            endpointsThrottlingConfig.operationsPerMinute /
              (scalabilityAwareThottlingConfig.processors ?? 1),
          ) || 1)
          : endpointsThrottlingConfig.operationsPerMinute;
        const lockKey = throttlingKeysGenerator.getLockKey(
          throttlingKeysGeneratorInput,
          endpointsThrottlingConfig,
        );
        const { throttlingLocksGenerator, throttlingQuotaTracker } =
          getThrottlingMechanism(lockKey);
        return new EndpointsThrottler<KeysGeneratorInput>(
          {
            ...endpointsThrottlingConfig,
            operationsPerMinute,
          },
          throttlingKeysGeneratorInput,
          throttlingKeysGenerator,
          throttlingLocksGenerator,
          throttlingQuotaTracker,
        );
      });
  }

  add = <T, TError extends Error>(
    url: string,
    operation: (url: string) => Promise<T>,
    options?: ThrottlingOperationOptions<TError>,
  ): Promise<T> => {
    const throttler = this.endpointsThrottlers.find((throttler) => {
      const { throttlingOptions: { urlRegexExpression, urlRegexFlags } } =
        throttler;
      return new RegExp(urlRegexExpression, urlRegexFlags).test(url);
    });
    if (!throttler) {
      throw new Error(`Throttler not found for url: ${url}`);
    }
    return throttler.add<T, TError>(url, operation, options);
  };
}
