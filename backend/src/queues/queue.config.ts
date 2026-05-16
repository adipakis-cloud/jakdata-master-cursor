import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
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
