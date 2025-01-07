import { Redis } from "ioredis";

const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
  username: "",
  password: "",
  tls: undefined, // set tls config if the env indicates
});

export default redis;
