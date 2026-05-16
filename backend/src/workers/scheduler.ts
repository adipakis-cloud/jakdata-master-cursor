import cron from "node-cron";
import { aiQueue } from "../queues/queue.config";
import { prisma } from "../config/prisma";

export function startScheduler() {
  cron.schedule("0 2 * * *", async () => {
    console.log(
      "[Scheduler] ⏰ Memulai analisa ekonomi harian semua warmindo..."
    );
    await aiQueue.add("economic-analysis-all", {}, { priority: 1 });
  });

  cron.schedule("0 3 * * *", async () => {
    console.log("[Scheduler] ⏰ Memulai kalkulasi territorial health RT...");

    const allRt = await prisma.rT.findMany({
      select: { id: true },
    });

    for (const rt of allRt) {
      await aiQueue.add(
        "territorial-health-rt",
        { rtId: rt.id },
        { priority: 1, delay: 5000 }
      );
    }

    console.log(
      `[Scheduler] ${allRt.length} RT dijadwalkan untuk health check`
    );
  });

  cron.schedule("0 * * * *", async () => {
    console.log("[Scheduler] ⏰ Fraud pattern check wilayah aktif...");

    const activeRt = await prisma.laporanWarga.groupBy({
      by: ["rtId"],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        rtId: { not: null },
      },
      _count: { id: true },
      having: {
        id: {
          _count: {
            gt: 2,
          },
        },
      },
    });

    for (const rt of activeRt) {
      if (rt.rtId) {
        await aiQueue.add(
          "fraud-check-wilayah",
          { rtId: rt.rtId },
          { priority: 7 }
        );
      }
    }
  });

  console.log("[Scheduler] ✓ Scheduler aktif — 3 cron job berjalan");
}
