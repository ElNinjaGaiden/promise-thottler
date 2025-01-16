import moment from "moment";
import {
  IThrottlingKeysGenerator,
  IThrottlingKeysGeneratorInput,
  EndpointsThrottlingConfig,
  ScalabilityAwareApiThrottlingConfig,
} from "./promise.throttler.types.ts";

export enum ATMS_KEYS {
  MEDI_ROUTES = "MEDI_ROUTES",
  TRIP_MASTER = "TRIP_MASTER",
}

export interface VehicleCompanyAtmsApiEndpointConfig
  extends IThrottlingKeysGeneratorInput {
  atmsKey: string;
  vehicleCompanyId?: number;
}

export const atmsApisThrottlingConfigs: Array<
  { atmsKey: ATMS_KEYS; endpointsThrottlingConfigs: EndpointsThrottlingConfig[] }
> = [
  {
    atmsKey: ATMS_KEYS.MEDI_ROUTES,
    endpointsThrottlingConfigs: [
      {
        urlSpecification: "api/v1/*",
        urlRegexExpression: "api/v1/(\/[-a-z\d%_.~+]*)*",
        urlRegexFlags: "i",
        matchingPrecedence: 2,
        operationsPerMinute: 50,
        retries: 3,
      },
      {
        urlSpecification: "api/v1/webhook/gps/vehicle",
        urlRegexExpression: "api/v1/webhook/gps/vehicle",
        urlRegexFlags: "i",
        matchingPrecedence: 1,
        operationsPerMinute: 50,
        retries: 3,
      },
    ],
  },
  {
    atmsKey: ATMS_KEYS.TRIP_MASTER,
    endpointsThrottlingConfigs: [
      {
        urlSpecification: "api/v1/*",
        urlRegexExpression: "api/v1/(\/[-a-z\d%_.~+]*)*",
        urlRegexFlags: "i",
        matchingPrecedence: 2,
        operationsPerMinute: 50,
        retries: 3,
      },
      {
        urlSpecification: "api/v1/webhook/gps/vehicle",
        urlRegexExpression: "api/v1/webhook/gps/vehicle",
        urlRegexFlags: "i",
        matchingPrecedence: 1,
        operationsPerMinute: 50,
        retries: 3,
      },
    ],
  },
];

export const scalabilityAwareThottlingConfig:
ScalabilityAwareApiThrottlingConfig = {
    autoScaleEnabled: false,
    processors: 5,
  };

export const OPERATIONS_TO_TEST: Array<
  { atmsKey: ATMS_KEYS, vehicleCompanyId?: number; operations: Array<{ url: string; quantity: number }> }
> = [
  {
    atmsKey: ATMS_KEYS.MEDI_ROUTES,
    operations: [
      {
        url: "api/v1/endpoint1",
        quantity: 20, // 125
      },
      {
        url: "api/v1/endpoint2",
        quantity: 20, // 125
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
        quantity: 20, // 125
      },
      {
        url: "api/v1/endpoint2",
        quantity: 20, // 125
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
  implements
  IThrottlingKeysGenerator<VehicleCompanyAtmsApiEndpointConfig> {
  getLockKey = (input: VehicleCompanyAtmsApiEndpointConfig, throttlerConfig: EndpointsThrottlingConfig): string => {
    const { atmsKey, vehicleCompanyId } = input;
    const { urlSpecification } = throttlerConfig;
    return `${environment}:atms:${atmsKey}${
      vehicleCompanyId ? `:${vehicleCompanyId}` : ""
    }:throttling:${urlSpecification}:lock`;
  };

  getCounterKey = (
    input: VehicleCompanyAtmsApiEndpointConfig,
    throttlerConfig: EndpointsThrottlingConfig,
    moment: moment.Moment,
  ) => {
    const currentHourMinute = moment.format("HH-mm");
    const { atmsKey, vehicleCompanyId } = input;
    const { urlSpecification } = throttlerConfig;
    return `${environment}:atms:${atmsKey}${
      vehicleCompanyId ? `:${vehicleCompanyId}` : ""
    }:throttling:${urlSpecification}:counters:${currentHourMinute}`;
  };
}
