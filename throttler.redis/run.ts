import { test } from "../test.ts";
import { getThrottlingMechanismTest } from "./redis.throttlingMechanism.ts";

await test(getThrottlingMechanismTest);
