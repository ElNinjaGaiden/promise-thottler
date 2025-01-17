import { test } from "../test.ts";
import { getApiThrottler } from "./redis.throttlingMechanism.ts";

await test(getApiThrottler);
