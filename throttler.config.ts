import moment from "moment";
import {
  IPromiseThrottlerKeysGenerator,
  PromiseThrottlerOptions,
  ScalabilityAwarePromiseThrottlerOptions,
} from "./promise.throttler.types.ts";

export interface VehicleCompanyAtmsConfig {
  atmsKey: string;
  vehicleCompanyId?: number;
}

export const throttlerConfig: PromiseThrottlerOptions = {
  operationsPerMinute: 300,
  retries: 3,
};

export const scalabilityAwareThottlerConfig:
  ScalabilityAwarePromiseThrottlerOptions = {
    ...throttlerConfig,
    autoScaleEnabled: false,
    processors: 4,
  };

export const vehicleCompanyAtmsThrottlerKeysGeneratorInput:
  VehicleCompanyAtmsConfig = {
    atmsKey: "MEDI_ROUTES",
  };

export const NUMBER_OF_OPERATIONS = 100;
const environment = "local";
export const FAKE_OPERATION_DURATION_MILISECONDS = 500;
export const WAIT_FOR_BRAND_NEW_MINUTE_TO_START = true;

export class VehicleCompanyAtmsThrottlerKeysGenerator
  implements IPromiseThrottlerKeysGenerator {
  constructor(readonly vehicleCompanyAtmsConfig: VehicleCompanyAtmsConfig) {}
  getLockKey = (): string => {
    const { atmsKey, vehicleCompanyId } = this.vehicleCompanyAtmsConfig;
    return `${environment}:atms:${atmsKey}${
      vehicleCompanyId ? `:${vehicleCompanyId}` : ""
    }:throttling:lock`;
  };

  getCounterKey = (moment: moment.Moment) => {
    const currentHourMinute = moment.format("HH-mm");
    const { atmsKey, vehicleCompanyId } = this.vehicleCompanyAtmsConfig;
    return `${environment}:atms:${atmsKey}${
      vehicleCompanyId ? `:${vehicleCompanyId}` : ""
    }:throttling:counters:${currentHourMinute}`;
  };
}
