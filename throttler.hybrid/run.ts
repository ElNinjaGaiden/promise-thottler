import { test } from "../test.ts";
import { getApiThrottler } from "./hybrid.throttlingMechanism.ts";

await test(getApiThrottler);
