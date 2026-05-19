import IORedis from "ioredis";
import { Queue } from "bullmq";

export let redisConnection: IORedis | null = null;
export let aiQueue: Queue | null = null;
export let economicQueue: Queue | null = null;

const REDIS_ENABLED = process.env.REDIS_URL || process.env.REDIS_HOST ? true : false;

if (REDIS_ENABLED) {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDISHOST ?? process.env.REDIS_HOST ?? "localhost";
  const redisPort = Number(process.env.REDISPORT ?? process.env.REDIS_PORT ?? 6379);
  const redisPassword = process.env.REDISPASSWORD ?? process.env.REDIS_PASSWORD ?? undefined;

  const defaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  };

  try {
    redisConnection = redisUrl
      ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
      : new IORedis({ host: redisHost, port: redisPort, password: redisPassword, maxRetriesPerRequest: null });

    aiQueue = new Queue("ai-processing", { connection: redisConnection, defaultJobOptions });
    economicQueue = new Queue("economic-analysis", { connection: redisConnection, defaultJobOptions });
    console.log("Redis queue initialized");
  } catch (e) {
    console.warn("Redis queue error — queue disabled");
  }
} else {
  console.log("Redis not configured — queue disabled. API runs normally.");
}
