import moment from "moment";
import {
  IPromiseThrottlerKeysGenerator,
  PromiseThrottlerOptions,
} from "./promise.throttler.types.ts";

export interface VehicleCompanyAtmsConfig {
  atmsKey: string;
  vehicleCompanyId?: number;
}

export const throttlerConfig: PromiseThrottlerOptions = {
  operationsPerMinute: 100,
  retries: 3,
};

export const vehicleCompanyAtmsThrottlerKeysGeneratorInput:
  VehicleCompanyAtmsConfig = {
    atmsKey: "MEDI_ROUTES",
  };

export const NUMBER_OF_OPERATIONS = 75;
const environment = "local";

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
