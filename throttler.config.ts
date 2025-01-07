import { PromiseThrottlerOptions } from "./promise.throttler.types.ts";

export const throttlerConfig: PromiseThrottlerOptions = {
  atmsKey: "MEDI_ROUTES",
  operationsPerMinute: 10,
  retries: 3,
};

export const NUMBER_OF_OPERATIONS = 15;
