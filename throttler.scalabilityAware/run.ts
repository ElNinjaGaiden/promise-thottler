import { test } from "../test.ts";
import { getApiThrottler } from "./scalabilityAware.throttlingMechanism.ts";

await test(getApiThrottler);
