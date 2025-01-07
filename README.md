# How to run it

## Full distributed sync and quota consume track
- Run `deno task throttler:redis`. This implementation use redis to keep track of a quota consumption and redlock to lock and sync distributed operations.
- You need to have a local redis instance running on your local on port 6379 (default redis port).
- The ideal test is to open several command line windows and try to run this command at the same time on each of it in order to emulate several processors running at the same time and consuming quota synchronized.

## Redis quota consume track and local locking
- Run `deno task throttler:hybrid`. This implementation use redis to keep track of a quota consumption but use local locks, meaning it will kind of work on scenarios where thers only one instance of the processor running at a time.
- You need to have a local redis instance running on your local on port 6379 (default redis port).

## Local quota consume track and local locking
- Run `deno task throttler:memory`. This implementation use local locks, meaning it will kind of work on scenarios where thers only one instance of the processor running at a time.
- You DO NOT NEED to have a local redis instance running on your local.

## Configuration
- You can modify the quota config to use on each run by modifying values in the [throttler.config.ts file](https://github.com/ElNinjaGaiden/promise-thottler/blob/main/throttler.config.ts). The two most important properties are `operationsPerMinute` and `NUMBER_OF_OPERATIONS`.

### Example
- 4 processors running 15 operations "at the same time" with a quota of 30 operations per minute:
- Advice: Play it at 2.x playback speed

https://github.com/user-attachments/assets/4936c396-dd36-4b59-8d94-cb1ecbe8781b

