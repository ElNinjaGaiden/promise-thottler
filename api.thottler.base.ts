import {
  EndpointsThrottlingConfig,
  IApiThrottler,
  IEndpointsThrottler,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  ThrottlingOperationOptions,
} from "./promise.throttler.types.ts";

export abstract class ApiThrottlerBase<
  KeysGeneratorInput extends IThrottlingKeysGeneratorInput,
> implements IApiThrottler {
  protected readonly sortedEndpointsThrottlingConfigs:
    EndpointsThrottlingConfig[];
  protected endpointsThrottlers: IEndpointsThrottler[] = [];

  constructor(
    endpointsThrottlingConfigs: EndpointsThrottlingConfig[],
    readonly throttlingKeysGeneratorInput: KeysGeneratorInput,
    readonly throttlingKeysGenerator: IThrottlingKeysGenerator<
      KeysGeneratorInput
    >,
  ) {
    this.sortedEndpointsThrottlingConfigs = endpointsThrottlingConfigs
      .sort((a, b) => a.matchingPrecedence - b.matchingPrecedence);
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
    if (options?.onOperationAssignedToThrottler) {
      const { throttlingOptions: { urlSpecification, urlRegexExpression } } =
        throttler;
      options.onOperationAssignedToThrottler(
        url,
        urlSpecification,
        urlRegexExpression,
        options?.id,
      );
    }
    return throttler.add<T, TError>(url, operation, options);
  };
}
