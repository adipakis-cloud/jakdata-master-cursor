import IORedis from "ioredis";
import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDISHOST ?? process.env.REDIS_HOST ?? "localhost";
const redisPort = Number(process.env.REDISPORT ?? process.env.REDIS_PORT ?? 6379);
const redisPassword = process.env.REDISPASSWORD ?? process.env.REDIS_PASSWORD ?? undefined;

export const redisConnection = redisUrl
  ? new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      tls: redisUrl.startsWith("rediss://")
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : new IORedis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
    });

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: 50,
  removeOnFail: 100,
};

export const aiQueue = new Queue("ai-processing", {
  connection: redisConnection,
  defaultJobOptions,
});

export const economicQueue = new Queue("economic-analysis", {
  connection: redisConnection,
  defaultJobOptions,
});
