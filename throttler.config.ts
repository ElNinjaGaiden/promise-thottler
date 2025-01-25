import {
  EndpointsThrottlingConfig,
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  ScalabilityAwareApiThrottlingConfig,
} from "./promise.throttler.types.ts";

export enum ATMS_KEYS {
  MEDI_ROUTES = "MEDI_ROUTES",
  TRIP_MASTER = "TRIP_MASTER",
  ROUTE_GENIE = "ROUTE_GENIE",
}

export interface VehicleCompanyAtmsApiEndpointConfig
  extends IThrottlingKeysGeneratorInput {
  atmsKey: string;
  vehicleCompanyId?: number;
}

export const atmsApisThrottlingConfigs: Record<
  ATMS_KEYS,
  EndpointsThrottlingConfig[]
> = {
  MEDI_ROUTES: [
    {
      urlSpecification: "api/v1/*",
      urlRegexExpression: "api/v1/(\/[-a-z\d%_.~+]*)*",
      urlRegexFlags: "i",
      matchingPrecedence: 2,
      operationsPerPeriod: 60,
      unitOfTime: "minutes",
      periodsLength: 1,
      retries: 3,
      strategy: "rolling",
    },
    {
      urlSpecification: "api/v1/webhook/gps/vehicle",
      urlRegexExpression: "api/v1/webhook/gps/vehicle",
      urlRegexFlags: "i",
      matchingPrecedence: 1,
      operationsPerPeriod: 50,
      unitOfTime: "minutes",
      periodsLength: 1,
      retries: 3,
      strategy: "rolling",
    },
  ],
  TRIP_MASTER: [
    {
      urlSpecification: "api/v1/*",
      urlRegexExpression: "api/v1/(\/[-a-z\d%_.~+]*)*",
      urlRegexFlags: "i",
      matchingPrecedence: 2,
      operationsPerPeriod: 60,
      unitOfTime: "minutes",
      periodsLength: 1,
      retries: 3,
      strategy: "rolling",
    },
    {
      urlSpecification: "api/v1/webhook/gps/vehicle",
      urlRegexExpression: "api/v1/webhook/gps/vehicle",
      urlRegexFlags: "i",
      matchingPrecedence: 1,
      operationsPerPeriod: 50,
      unitOfTime: "minutes",
      periodsLength: 1,
      retries: 3,
      strategy: "rolling",
    },
  ],
  ROUTE_GENIE: [
    {
      urlSpecification: "api/v1/*",
      urlRegexExpression: "api/v1/(\/[-a-z\d%_.~+]*)*",
      urlRegexFlags: "i",
      matchingPrecedence: 2,
      operationsPerPeriod: 60,
      unitOfTime: "minutes",
      periodsLength: 1,
      retries: 3,
      strategy: "rolling",
    },
    {
      urlSpecification: "api/v1/webhook/gps/vehicle",
      urlRegexExpression: "api/v1/webhook/gps/vehicle",
      urlRegexFlags: "i",
      matchingPrecedence: 1,
      operationsPerPeriod: 50,
      unitOfTime: "minutes",
      periodsLength: 1,
      retries: 3,
      strategy: "rolling",
    },
  ],
};

export const scalabilityAwareThottlingConfig:
  ScalabilityAwareApiThrottlingConfig = {
    autoScaleEnabled: false,
    processors: 5,
  };

export const OPERATIONS_TO_TEST: Array<
  {
    atmsKey: ATMS_KEYS;
    vehicleCompanyId?: number;
    operations: Array<{ url: string; quantity: number }>;
  }
> = [
  {
    atmsKey: ATMS_KEYS.MEDI_ROUTES,
    operations: [
      {
        url: "api/v1/endpoint1",
        quantity: 25, // 125
      },
      {
        url: "api/v1/endpoint2",
        quantity: 25, // 125
      },
      {
        url: "api/v1/webhook/gps/vehicle",
        quantity: 20, // 50
      },
    ],
  },
  {
    atmsKey: ATMS_KEYS.TRIP_MASTER,
    operations: [
      {
        url: "api/v1/endpoint1",
        quantity: 25, // 125
      },
      {
        url: "api/v1/endpoint2",
        quantity: 25, // 125
      },
      {
        url: "api/v1/webhook/gps/vehicle",
        quantity: 20, // 50
      },
    ],
  },
  {
    atmsKey: ATMS_KEYS.ROUTE_GENIE,
    vehicleCompanyId: 1,
    operations: [
      {
        url: "api/v1/endpoint1",
        quantity: 25, // 125
      },
      {
        url: "api/v1/endpoint2",
        quantity: 25, // 125
      },
      {
        url: "api/v1/webhook/gps/vehicle",
        quantity: 20, // 50
      },
    ],
  },
  {
    atmsKey: ATMS_KEYS.ROUTE_GENIE,
    vehicleCompanyId: 2,
    operations: [
      {
        url: "api/v1/endpoint1",
        quantity: 25, // 125
      },
      {
        url: "api/v1/endpoint2",
        quantity: 25, // 125
      },
      {
        url: "api/v1/webhook/gps/vehicle",
        quantity: 20, // 50
      },
    ],
  },
];

const environment = "local";
export const FAKE_OPERATION_DURATION_MILISECONDS = 500;
export const WAIT_FOR_BRAND_NEW_MINUTE_TO_START = true;

export class VehicleCompanyAtmsThrottlingKeysGenerator
  implements IThrottlingKeysGenerator<VehicleCompanyAtmsApiEndpointConfig> {
  getLockKey = (
    input: VehicleCompanyAtmsApiEndpointConfig,
    throttlerConfig: EndpointsThrottlingConfig,
  ): string => {
    const { atmsKey, vehicleCompanyId } = input;
    const { urlSpecification } = throttlerConfig;
    return `${environment}:atms:${atmsKey}:throttling${
      vehicleCompanyId ? `:${vehicleCompanyId}` : ""
    }:${urlSpecification}:lock`;
  };

  getCounterKey = (
    input: VehicleCompanyAtmsApiEndpointConfig,
    throttlerConfig: EndpointsThrottlingConfig,
  ) => {
    const { atmsKey, vehicleCompanyId } = input;
    const { urlSpecification } = throttlerConfig;
    return `${environment}:atms:${atmsKey}:throttling${
      vehicleCompanyId ? `:${vehicleCompanyId}` : ""
    }:${urlSpecification}:`;
  };
}
