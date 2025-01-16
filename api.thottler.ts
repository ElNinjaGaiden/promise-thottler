import { EndpointsThrottler } from "./promise.throttler.ts";
import {
  IApiThrottler,
  IEndpointsThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  IThrottlingLocksGenerator,
  IThrottlingQuotaTracker,
  ThrottlingOperationOptions,
  EndpointsThrottlingConfig,
  ScalabilityAwareApiThrottlingConfig,
} from "./promise.throttler.types.ts";

export class ApiThrottler<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> implements IApiThrottler {
  private readonly endpointsThrottlers: IEndpointsThrottler[] = [];

  constructor(
    readonly endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
    readonly scalabilityAwareThottlingConfig: ScalabilityAwareApiThrottlingConfig,
    readonly throttlingKeysGeneratorInput: KeysGeneratorInput,
    readonly throttlingKeysGenerator: IThrottlingKeysGenerator<
      KeysGeneratorInput
    >,
    readonly throttlingLocksGenerator: IThrottlingLocksGenerator,
    readonly throttlingQuotaTracker: IThrottlingQuotaTracker,
  ) {
    const { autoScaleEnabled, processors } = this.scalabilityAwareThottlingConfig;
    const autoScalabilityDisabledCorrectly = autoScaleEnabled === false && processors && processors >= 1;
    if (autoScaleEnabled === false && !autoScalabilityDisabledCorrectly
    ) {
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
        return new EndpointsThrottler<KeysGeneratorInput>(
          {
            ...endpointsThrottlingConfig,
            operationsPerMinute
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
    const throttler = this.endpointsThrottlers.find(throttler => {
      const { throttlingOptions: { urlRegexExpression, urlRegexFlags } } = throttler;
      return new RegExp(urlRegexExpression, urlRegexFlags).test(url);
    });
    if (!throttler) {
      throw new Error(`Throttler not found for url: ${url}`);
    }
    return throttler.add<T, TError>(url, operation, options);
  };
}
