import { test } from "../test.ts";
import { getThrottlerMechanismTest } from "./scalabilityAware.throttlingMechanism.ts";

await test(getThrottlerMechanismTest());
