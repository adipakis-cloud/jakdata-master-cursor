import { DistribusiStatus, Prisma, StatusEkonomi } from '@prisma/client';
import { prisma } from '../../config/prisma';

const HIGH_RISK_STATUS: StatusEkonomi[] = [StatusEkonomi.sangat_miskin, StatusEkonomi.miskin];

function penerimaWhereForRt(rtId: number): Prisma.BantuanPenerimaWhereInput {
  return {
    status: { not: DistribusiStatus.ditolak },
    bantuan: { aktif: true },
    keluargaId: { not: null },
    OR: [{ rtId }, { keluarga: { rtId } }],
  };
}

function riskLevelFromScore(score: number): 'aman' | 'perhatian' | 'kritis' {
  if (score >= 75) return 'aman';
  if (score >= 50) return 'perhatian';
  return 'kritis';
}

export type FairnessScoreResult = {
  rtId: number;
  fairnessScore: number;
  totalKeluarga: number;
  totalHighRisk: number;
  totalRecipients: number;
  repeatedRecipients: number;
  uncoveredHighRisk: number;
  coverageRate: number;
  priorityMissRate: number;
  duplicateRate: number;
  riskLevel: 'aman' | 'perhatian' | 'kritis';
};

/**
 * Fairness of aid distribution for one RT. Persists BantuanFairnessSnapshot.
 */
export async function calculateFairnessScore(rtId: number): Promise<FairnessScoreResult> {
  const totalKeluarga = await prisma.keluarga.count({ where: { rtId } });

  const highRiskCount = await prisma.keluarga.count({
    where: { rtId, statusEkonomi: { in: HIGH_RISK_STATUS } },
  });

  const penerimaRows = await prisma.bantuanPenerima.findMany({
    where: penerimaWhereForRt(rtId),
    select: { keluargaId: true, bantuanId: true },
  });

  const byKeluarga = new Map<number, { bantuanIds: Set<number>; count: number }>();
  for (const row of penerimaRows) {
    const kid = row.keluargaId!;
    let entry = byKeluarga.get(kid);
    if (!entry) {
      entry = { bantuanIds: new Set<number>(), count: 0 };
      byKeluarga.set(kid, entry);
    }
    entry.count += 1;
    entry.bantuanIds.add(row.bantuanId);
  }

  const uniqueRecipientIds = new Set(byKeluarga.keys());
  const repeatedCount = [...byKeluarga.values()].filter((v) => v.count > 1).length;

  const highRiskFamilies = await prisma.keluarga.findMany({
    where: { rtId, statusEkonomi: { in: HIGH_RISK_STATUS } },
    select: { id: true },
  });
  const highRiskInRecipients = highRiskFamilies.filter((f) => uniqueRecipientIds.has(f.id)).length;
  const highRiskNotCovered = Math.max(0, highRiskCount - highRiskInRecipients);

  if (totalKeluarga === 0) {
    const score = 100;
    await prisma.bantuanFairnessSnapshot.create({
      data: {
        kodeSnapshot: `FAIR-RT-${rtId}-${Date.now()}`,
        wilayahLevel: 'RT',
        wilayahId: rtId,
        fairnessScore: score,
        repeatedRecipients: 0,
        uncoveredHighRisk: highRiskNotCovered,
        totalRecipients: 0,
        totalHighRisk: highRiskCount,
        metrics: {
          coverageRate: 0,
          priorityMissRate: highRiskCount > 0 ? 1 : 0,
          duplicateRate: 0,
          totalKeluarga: 0,
        } as Prisma.InputJsonValue,
      },
    });
    return {
      rtId,
      fairnessScore: score,
      totalKeluarga: 0,
      totalHighRisk: highRiskCount,
      totalRecipients: 0,
      repeatedRecipients: 0,
      uncoveredHighRisk: highRiskNotCovered,
      coverageRate: 0,
      priorityMissRate: highRiskCount > 0 ? 1 : 0,
      duplicateRate: 0,
      riskLevel: riskLevelFromScore(score),
    };
  }

  const coverageRate = uniqueRecipientIds.size / totalKeluarga;
  const priorityMissRate = highRiskNotCovered / Math.max(highRiskCount, 1);
  const duplicateRate = repeatedCount / Math.max(uniqueRecipientIds.size, 1);

  const rawScore =
    coverageRate * 50 + (1 - priorityMissRate) * 35 + (1 - duplicateRate) * 15;
  const score = Math.round(Math.min(100, Math.max(0, rawScore)));

  await prisma.bantuanFairnessSnapshot.create({
    data: {
      kodeSnapshot: `FAIR-RT-${rtId}-${Date.now()}`,
      wilayahLevel: 'RT',
      wilayahId: rtId,
      fairnessScore: score,
      repeatedRecipients: repeatedCount,
      uncoveredHighRisk: highRiskNotCovered,
      totalRecipients: uniqueRecipientIds.size,
      totalHighRisk: highRiskCount,
      metrics: {
        coverageRate,
        priorityMissRate,
        duplicateRate,
        totalKeluarga,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    rtId,
    fairnessScore: score,
    totalKeluarga,
    totalHighRisk: highRiskCount,
    totalRecipients: uniqueRecipientIds.size,
    repeatedRecipients: repeatedCount,
    uncoveredHighRisk: highRiskNotCovered,
    coverageRate,
    priorityMissRate,
    duplicateRate,
    riskLevel: riskLevelFromScore(score),
  };
}

export type BantuanAnomalyRow = Awaited<ReturnType<typeof prisma.bantuanAnomaly.create>>;

/**
 * Opens BantuanAnomaly rows for duplicate recipients and uncovered high-risk keluarga (idempotent for open rows).
 */
export async function detectAnomalies(rtId: number): Promise<BantuanAnomalyRow[]> {
  const created: BantuanAnomalyRow[] = [];

  const penerimaRows = await prisma.bantuanPenerima.findMany({
    where: penerimaWhereForRt(rtId),
    select: { keluargaId: true, bantuanId: true },
  });

  const byKeluarga = new Map<number, { count: number; bantuanIds: number[] }>();
  for (const row of penerimaRows) {
    const kid = row.keluargaId!;
    let entry = byKeluarga.get(kid);
    if (!entry) {
      entry = { count: 0, bantuanIds: [] };
      byKeluarga.set(kid, entry);
    }
    entry.count += 1;
    entry.bantuanIds.push(row.bantuanId);
  }

  for (const [keluargaId, { count, bantuanIds }] of byKeluarga) {
    if (count <= 1) continue;
    const dup = await prisma.bantuanAnomaly.findFirst({
      where: {
        keluargaId,
        rtId,
        tipe: 'duplicate_recipient',
        status: 'open',
      },
    });
    if (dup) continue;
    const row = await prisma.bantuanAnomaly.create({
      data: {
        kodeAnomaly: `ANM-DUP-${keluargaId}-${Date.now()}`,
        tipe: 'duplicate_recipient',
        severity: 'high',
        keluargaId,
        rtId,
        title: 'Penerima Bantuan Ganda',
        description: `Keluarga memiliki ${count} entri penerima bantuan (${[...new Set(bantuanIds)].length} program berbeda)`,
        status: 'open',
        metadata: { count, bantuanIds: [...new Set(bantuanIds)] } as Prisma.InputJsonValue,
      },
    });
    created.push(row);
  }

  const recipientIds = new Set(byKeluarga.keys());
  const highRiskFamilies = await prisma.keluarga.findMany({
    where: { rtId, statusEkonomi: { in: HIGH_RISK_STATUS } },
    select: { id: true, statusEkonomi: true, namaKepala: true },
  });

  for (const fam of highRiskFamilies) {
    if (recipientIds.has(fam.id)) continue;
    const miss = await prisma.bantuanAnomaly.findFirst({
      where: {
        keluargaId: fam.id,
        rtId,
        tipe: 'high_risk_uncovered',
        status: 'open',
      },
    });
    if (miss) continue;
    const row = await prisma.bantuanAnomaly.create({
      data: {
        kodeAnomaly: `ANM-MISS-${fam.id}-${Date.now()}`,
        tipe: 'high_risk_uncovered',
        severity: 'critical',
        keluargaId: fam.id,
        rtId,
        title: 'Keluarga Risiko Tinggi Tidak Mendapat Bantuan',
        description: `Keluarga dengan status ${fam.statusEkonomi} belum terdaftar bantuan apapun`,
        status: 'open',
        metadata: {
          statusEkonomi: fam.statusEkonomi,
          namaKepala: fam.namaKepala,
        } as Prisma.InputJsonValue,
      },
    });
    created.push(row);
  }

  return created;
}
