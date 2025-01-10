import { test } from "../test.ts";
import { throttler as inMemoryThrottler } from "./memory.throttler.blocking.ts";

await test(inMemoryThrottler);
