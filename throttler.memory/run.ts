import { test } from "../test.ts";
import { getApiThrottler } from "./memory.throttlingMechanism.ts";

await test(getApiThrottler);
