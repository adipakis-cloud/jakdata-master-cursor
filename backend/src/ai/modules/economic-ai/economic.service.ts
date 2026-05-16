import { prisma } from "../../../config/prisma";
import { callAIJson } from "../../core/anthropic.service";

interface EconomicHealthResult {
  score: number;
  trend: "stable" | "declining" | "recovering" | "critical";
  riskLevel: "low" | "medium" | "high" | "critical";
  indicators: {
    revenueChange: number;
    debtRatio: number;
    customerTrend: number;
    buyingPowerIndex: number;
  };
  alerts: string[];
  summary: string;
  recommendations: string[];
}

function getCurrentPeriod(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function analyzeWarmindoEconomics(
  warmindoId: number
): Promise<void> {
  const warmindo = await prisma.warmindoOutlet.findUnique({
    where: { id: warmindoId },
    include: { rt: true, kelurahan: true },
  });

  if (!warmindo) {
    console.warn(`[Economic AI] Warmindo ${warmindoId} tidak ditemukan`);
    return;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const transaksiTerbaru = await prisma.warmindoTransaksi.aggregate({
    where: {
      warmindoId,
      tanggal: { gte: thirtyDaysAgo },
    },
    _sum: { totalOmzet: true, grossProfit: true, jumlahItem: true },
    _count: { id: true },
    _avg: { totalOmzet: true },
  });

  const transaksiSebelumnya = await prisma.warmindoTransaksi.aggregate({
    where: {
      warmindoId,
      tanggal: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
    _sum: { totalOmzet: true, grossProfit: true },
    _count: { id: true },
    _avg: { totalOmzet: true },
  });

  const pengeluaran = await prisma.warmindoPengeluaran.aggregate({
    where: {
      warmindoId,
      tanggal: { gte: thirtyDaysAgo },
    },
    _sum: { jumlah: true },
  });

  const topProduk = await prisma.warmindoSaleLineItem.groupBy({
    by: ["productName"],
    where: {
      warmindoId,
      createdAt: { gte: thirtyDaysAgo },
    },
    _sum: { total: true, qty: true },
    orderBy: { _sum: { total: "desc" } },
    take: 5,
  });

  const closingVariance = await prisma.warmindoDailyClosing.aggregate({
    where: {
      warmindoId,
      tanggal: { gte: thirtyDaysAgo },
    },
    _avg: { variance: true },
    _sum: { variance: true },
  });

  const omzetTerbaru = transaksiTerbaru._sum.totalOmzet ?? 0;
  const omzetSebelumnya = transaksiSebelumnya._sum.totalOmzet ?? 0;
  const revenueChange =
    omzetSebelumnya > 0
      ? ((omzetTerbaru - omzetSebelumnya) / omzetSebelumnya) * 100
      : 0;

  const result = await callAIJson<EconomicHealthResult>(
    `Kamu adalah analis ekonomi mikro untuk jaringan Warmindo dalam sistem JAKDATA.
Warmindo bukan hanya warung makan biasa — ini adalah SENSOR EKONOMI wilayah RT/RW.
Penurunan omzet Warmindo = sinyal penurunan daya beli warga sekitar.
Lonjakan hutang = sinyal tekanan ekonomi warga.
Perubahan pola pembelian = sinyal pergeseran kemampuan ekonomi.

Berikan analisa kesehatan ekonomi Warmindo dan wilayahnya (score 0-100).
Semakin tinggi score = semakin sehat.

Balas HANYA dengan JSON:
{
  "score": number,
  "trend": "stable|declining|recovering|critical",
  "riskLevel": "low|medium|high|critical",
  "indicators": {
    "revenueChange": number,
    "debtRatio": number,
    "customerTrend": number,
    "buyingPowerIndex": number
  },
  "alerts": string[],
  "summary": string,
  "recommendations": string[]
}`,
    JSON.stringify({
      warmindo: {
        id: warmindoId,
        nama: warmindo.namaOutlet,
        rt: warmindo.rt?.nomor ?? null,
        kelurahan: warmindo.kelurahan?.nama ?? null,
        targetOmzetHarian: warmindo.targetOmzetHarian,
        targetLabaBulanan: warmindo.targetLabaBulanan,
      },
      periode30Hari: {
        totalOmzet: omzetTerbaru,
        totalProfit: transaksiTerbaru._sum.grossProfit ?? 0,
        totalTransaksi: transaksiTerbaru._count.id,
        rataOmzetPerHari: transaksiTerbaru._avg.totalOmzet ?? 0,
        totalPengeluaran: pengeluaran._sum.jumlah ?? 0,
      },
      perbandinganPeriodeSebelumnya: {
        totalOmzet: omzetSebelumnya,
        totalTransaksi: transaksiSebelumnya._count.id,
        revenueChangePercent: revenueChange,
      },
      kasVariance: {
        rataVarianceHarian: closingVariance._avg.variance ?? 0,
        totalVariance: closingVariance._sum.variance ?? 0,
      },
      topProduk: topProduk.map((p) => ({
        nama: p.productName,
        totalRevenue: p._sum.total,
        totalQty: p._sum.qty,
      })),
    })
  );

  const period = getCurrentPeriod();
  await prisma.economicScore.upsert({
    where: {
      wilayahId_period: {
        wilayahId: String(warmindoId),
        period,
      },
    },
    update: {
      score: result.score,
      trend: result.trend,
      indicators: result.indicators,
    },
    create: {
      wilayahId: String(warmindoId),
      score: result.score,
      trend: result.trend,
      indicators: result.indicators,
      period,
    },
  });

  for (const alertMsg of result.alerts) {
    await prisma.economicAlert.create({
      data: {
        warmindoId: String(warmindoId),
        wilayahId: warmindo.rtId ? String(warmindo.rtId) : null,
        alertType:
          result.trend === "critical" ? "revenue_drop" : "buying_power_decline",
        message: alertMsg,
      },
    });
  }

  if (result.riskLevel === "critical" || result.score < 30) {
    await prisma.aiAlert.create({
      data: {
        alertType: "economic",
        severity: "critical",
        wilayahScope: warmindo.rtId ? "rt" : "kelurahan",
        wilayahId: String(warmindo.rtId ?? warmindo.kelurahanId ?? "unknown"),
        title: `Kondisi ekonomi kritis — ${warmindo.namaOutlet}`,
        description: result.summary,
        payload: {
          warmindoId,
          score: result.score,
          trend: result.trend,
          revenueChange,
          alerts: result.alerts,
        },
      },
    });
  }

  if (result.score < 50) {
    await prisma.aiRecommendation.create({
      data: {
        targetType: "koordinator",
        targetWilayahId: warmindo.rtId ? String(warmindo.rtId) : null,
        category: "ekonomi",
        priority: result.score < 30 ? "high" : "medium",
        title: `Perhatian ekonomi wilayah — ${warmindo.namaOutlet}`,
        body: `${result.summary}\n\nRekomendasi:\n${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
        evidence: result as object,
      },
    });
  }

  console.log(
    `[Economic AI] ${warmindo.namaOutlet} — score: ${result.score} | trend: ${result.trend}`
  );
}

export async function analyzeAllActiveWarmindo(): Promise<void> {
  const activeOutlets = await prisma.warmindoOutlet.findMany({
    where: { status: "aktif", aktif: true },
    select: { id: true, namaOutlet: true },
  });

  console.log(
    `[Economic AI] Menganalisa ${activeOutlets.length} outlet aktif...`
  );

  for (const outlet of activeOutlets) {
    try {
      await analyzeWarmindoEconomics(outlet.id);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(
        `[Economic AI] Error pada outlet ${outlet.namaOutlet}:`,
        err
      );
    }
  }

  console.log(`[Economic AI] ✓ Selesai analisa semua outlet`);
}
