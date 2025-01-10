import { test } from "../test.ts";
import { throttler as scalabilityAwareThrottler } from "./scalabilityAware.throttler.ts";

await test(scalabilityAwareThrottler);
