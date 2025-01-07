import { test } from "../test.ts";
import { throttler as redisThrottler } from "./redis.throttler.ts";

await test(redisThrottler);
