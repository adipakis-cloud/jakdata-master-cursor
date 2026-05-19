import { Worker } from "bullmq";
import { redisConnection } from "../queues/queue.config";
import { checkLaporanFraud } from "../ai/modules/fraud-detection/fraud.service";
import {
  analyzeWarmindoEconomics,
  analyzeAllActiveWarmindo,
} from "../ai/modules/economic-ai/economic.service";

export function startAiWorker() {
  if (!redisConnection) {
    console.warn("[AI Worker] Redis tidak tersedia — worker dinonaktifkan");
    return null;
  }

  const worker = new Worker(
    "ai-processing",
    async (job) => {
      console.log(`[AI Worker] Job: ${job.name}`, job.data);
      switch (job.name) {
        case "fraud-check-laporan":
          await checkLaporanFraud(job.data.laporanId);
          break;
        case "economic-analysis-warmindo":
          await analyzeWarmindoEconomics(job.data.warmindoId);
          break;
        case "economic-analysis-all":
          await analyzeAllActiveWarmindo();
          break;
        case "territorial-health-rt":
          console.warn(`[AI Worker] territorial-health-rt belum diimplementasi`, job.data);
          break;
        case "fraud-check-wilayah":
          console.warn(`[AI Worker] fraud-check-wilayah belum diimplementasi`, job.data);
          break;
        default:
          console.warn(`[AI Worker] Job tidak dikenal: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[AI Worker] Selesai: ${job.name} (${job.id})`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[AI Worker] Gagal: ${job?.name}`, err.message);
  });
  console.log("[AI Worker] Berjalan dan menunggu job...");
  return worker;
}
