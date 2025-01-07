import { test } from "../test.ts";
import { throttler as memoryThrottler } from "./memory.throttler.ts";

await test(memoryThrottler);
