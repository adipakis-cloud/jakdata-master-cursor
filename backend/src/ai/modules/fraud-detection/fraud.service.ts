import { prisma } from "../../../config/prisma";
import { callAIJson } from "../../core/anthropic.service";

interface FraudResult {
  fraudScore: number;
  signals: string[];
  explanation: string;
}

export async function checkLaporanFraud(laporanId: number | string): Promise<void> {
  const id =
    typeof laporanId === "string" ? parseInt(laporanId, 10) : laporanId;

  if (!Number.isFinite(id)) {
    console.warn(`[Fraud] laporanId tidak valid: ${laporanId}`);
    return;
  }

  const laporan = await prisma.laporanWarga.findUnique({
    where: { id },
    include: { rt: true },
  });

  if (!laporan) {
    console.warn(`[Fraud] Laporan ${id} tidak ditemukan`);
    return;
  }

  const histori = await prisma.laporanWarga.count({
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      ...(laporan.rtId != null ? { rtId: laporan.rtId } : {}),
    },
  });

  const result = await callAIJson<FraudResult>(
    `Kamu adalah sistem deteksi fraud laporan warga Indonesia.
Berikan fraud score 0.0 (asli) hingga 1.0 (sangat mencurigakan).
Balas JSON: { "fraudScore": number, "signals": string[], "explanation": string }`,
    JSON.stringify({
      laporan: {
        id: laporan.id,
        kategori: laporan.kategori,
        isiLaporan: laporan.isiLaporan,
        createdAt: laporan.createdAt,
      },
      konteks: { totalLaporanBulanIni: histori },
    })
  );

  await prisma.fraudScore.upsert({
    where: {
      subjectType_subjectId: {
        subjectType: "laporan",
        subjectId: String(id),
      },
    },
    update: {
      score: result.fraudScore,
      signals: result.signals,
      calculatedAt: new Date(),
    },
    create: {
      subjectType: "laporan",
      subjectId: String(id),
      score: result.fraudScore,
      signals: result.signals,
    },
  });

  if (result.fraudScore >= 0.7) {
    await prisma.aiAlert.create({
      data: {
        alertType: "fraud",
        severity: result.fraudScore >= 0.85 ? "critical" : "high",
        wilayahScope: "rt",
        wilayahId: laporan.rtId != null ? String(laporan.rtId) : "unknown",
        title: "Laporan mencurigakan terdeteksi",
        description: result.explanation,
        payload: { laporanId: id, fraudScore: result.fraudScore },
      },
    });
  }

  console.log(`[Fraud] ${id} → score: ${result.fraudScore}`);
}
