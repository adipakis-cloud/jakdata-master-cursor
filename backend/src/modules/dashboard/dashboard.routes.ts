import { OperationalAlertStatus, ReportStatus, UrgencyLevel, WarmindoStatus } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../config/prisma';
import { territoryScopeMiddleware } from '../../middleware/territoryScope.middleware';
import { buildLaporanListWhere, buildWilayahKeyedListWhere, resolveVisibleRtIds } from '../security/security';

import { DAPIL3_KOTA_KODES, dapil3KelurahanWhere, dapil3KecamatanWhere, KOORDINATOR_FIELD_ROLES } from '../../lib/dapil3';

function authScope(app: FastifyInstance) {
  return [app.authenticate, territoryScopeMiddleware];
}

function dapil3KotaWhere() {
  return { kecamatan: { kota: { kode: { in: [...DAPIL3_KOTA_KODES] } } } };
}

function adminIntelRoles(user: any) {
  return ['admin_pusat', 'admin_kota', 'auditor', 'finance_admin'].includes(user?.role);
}

function adminIntelPre(app: FastifyInstance) {
  return [
    app.authenticate,
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!adminIntelRoles((req as any).user)) {
        return reply.code(403).send({ error: 'Hanya admin pusat/kota, auditor, atau finance.' });
      }
    },
  ];
}

const OPEN_OPERATIONAL_ALERT_STATUSES: OperationalAlertStatus[] = [
  OperationalAlertStatus.open,
  OperationalAlertStatus.acknowledged,
];

async function warmindoOutletWhereForUser(user: any, rtIds: number[] | null) {
  if (!user) return { id: -1 };
  if (['manager_warmindo', 'kasir_warmindo'].includes(user.role)) {
    return user.warmindoId ? { id: user.warmindoId } : { id: -1 };
  }
  if (user.role === 'admin_pusat' || user.role === 'auditor' || user.role === 'finance_admin') return {};
  if (rtIds === null) return {};
  if (rtIds.length === 0) return { id: -1 };
  const kelRows = await prisma.rT.findMany({
    where: { id: { in: rtIds } },
    select: { rw: { select: { kelurahanId: true } } },
  });
  const kelIds = [...new Set(kelRows.map((r) => r.rw.kelurahanId))];
  return { OR: [{ rtId: { in: rtIds } }, { kelurahanId: { in: kelIds } }] };
}

export async function dashboardRoutes(app: FastifyInstance) {
  /** Compact counts for mobile / health checks (territory-scoped). */
  app.get('/stats', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const rtIds = await resolveVisibleRtIds(user);
    const wargaWhere: any =
      rtIds === null ? { deletedAt: null } : rtIds.length === 0 ? { id: -1, deletedAt: null } : { rtId: { in: rtIds }, deletedAt: null };
    const laporanWhere: any = await buildLaporanListWhere(user);
    const penerimaWhere: any =
      rtIds === null
        ? {}
        : rtIds.length === 0
          ? { id: -1 }
          : { OR: [{ rtId: { in: rtIds } }, { keluarga: { rtId: { in: rtIds } } }] };

    const [totalWarga, totalLaporan, totalBantuan, laporanPending, laporanSelesai] = await Promise.all([
      prisma.warga.count({ where: wargaWhere }),
      prisma.laporanWarga.count({ where: laporanWhere }),
      prisma.bantuanPenerima.count({ where: penerimaWhere }),
      prisma.laporanWarga.count({
        where: { AND: [laporanWhere, { status: { notIn: ['selesai', 'ditolak'] } }] },
      }),
      prisma.laporanWarga.count({ where: { AND: [laporanWhere, { status: 'selesai' }] } }),
    ]);

    return { totalWarga, totalLaporan, totalBantuan, laporanPending, laporanSelesai };
  });

  /** Dapil 3 — kecamatan/kelurahan aktif vs belum ada koordinator. */
  app.get('/wilayah-status', { preHandler: authScope(app) }, async () => {
    const koordRoles = [...KOORDINATOR_FIELD_ROLES];

    const kecamatanList = await prisma.kecamatan.findMany({
      where: dapil3KecamatanWhere(),
      include: {
        kota: { select: { nama: true } },
        kelurahan: {
          select: { id: true, nama: true },
          orderBy: { nama: 'asc' },
        },
      },
      orderBy: [{ kota: { nama: 'asc' } }, { nama: 'asc' }],
    });

    async function koordCountForKecamatan(kecId: number) {
      return prisma.user.count({
        where: {
          aktif: true,
          role: { in: koordRoles },
          OR: [
            { kecamatanId: kecId },
            { kelurahan: { kecamatanId: kecId } },
            { rw: { kelurahan: { kecamatanId: kecId } } },
            { rt: { rw: { kelurahan: { kecamatanId: kecId } } } },
          ],
        },
      });
    }

    async function laporanCountForKecamatan(kecId: number) {
      return prisma.laporanWarga.count({
        where: {
          OR: [
            { kecamatanId: kecId },
            { kelurahan: { kecamatanId: kecId } },
            { rt: { rw: { kelurahan: { kecamatanId: kecId } } } },
          ],
        },
      });
    }

    async function wargaCountForKecamatan(kecId: number) {
      return prisma.warga.count({
        where: { deletedAt: null, rt: { rw: { kelurahan: { kecamatanId: kecId } } } },
      });
    }

    async function koordCountForKelurahan(kelId: number) {
      return prisma.user.count({
        where: {
          aktif: true,
          role: { in: koordRoles },
          OR: [
            { kelurahanId: kelId },
            { rw: { kelurahanId: kelId } },
            { rt: { rw: { kelurahanId: kelId } } },
          ],
        },
      });
    }

    async function laporanCountForKelurahan(kelId: number) {
      return prisma.laporanWarga.count({
        where: {
          OR: [{ kelurahanId: kelId }, { rt: { rw: { kelurahanId: kelId } } }],
        },
      });
    }

    async function wargaCountForKelurahan(kelId: number) {
      return prisma.warga.count({
        where: { deletedAt: null, rt: { rw: { kelurahanId: kelId } } },
      });
    }

    const kecamatan = await Promise.all(
      kecamatanList.map(async (kec) => {
        const [koordinatorCount, laporanCount, wargaCount] = await Promise.all([
          koordCountForKecamatan(kec.id),
          laporanCountForKecamatan(kec.id),
          wargaCountForKecamatan(kec.id),
        ]);
        const status =
          koordinatorCount > 0 || laporanCount > 0 || wargaCount > 0 ? 'aktif' : 'belum_aktif';

        const kelurahan = await Promise.all(
          kec.kelurahan.map(async (kel) => {
            const [kKoord, kLap, kWarga] = await Promise.all([
              koordCountForKelurahan(kel.id),
              laporanCountForKelurahan(kel.id),
              wargaCountForKelurahan(kel.id),
            ]);
            return {
              id: kel.id,
              nama: kel.nama,
              status: kKoord > 0 || kLap > 0 || kWarga > 0 ? 'aktif' : 'belum_aktif',
              koordinatorCount: kKoord,
              laporanCount: kLap,
              wargaCount: kWarga,
            };
          }),
        );

        return {
          id: kec.id,
          nama: kec.nama,
          kotaNama: kec.kota.nama,
          status,
          koordinatorCount,
          laporanCount,
          wargaCount,
          kelurahan,
        };
      }),
    );

    const totalKelurahan = kecamatan.reduce((s, k) => s + k.kelurahan.length, 0);
    const kelurahanAktif = kecamatan.reduce(
      (s, k) => s + k.kelurahan.filter((x) => x.status === 'aktif').length,
      0,
    );
    const kecamatanAktif = kecamatan.filter((k) => k.status === 'aktif').length;

    const dapilRtIds = (
      await prisma.rT.findMany({
        where: { rw: { kelurahan: dapil3KelurahanWhere() } },
        select: { id: true },
      })
    ).map((r) => r.id);

    const [totalKoordinator, totalLaporan, totalWarga, laporanHariIni, recentLaporan] = await Promise.all([
      prisma.user.count({
        where: {
          aktif: true,
          role: { in: koordRoles },
          OR: [
            { kecamatan: dapil3KecamatanWhere() },
            { kelurahan: dapil3KelurahanWhere() },
            { rw: { kelurahan: dapil3KelurahanWhere() } },
            { rt: { rw: { kelurahan: dapil3KelurahanWhere() } } },
          ],
        },
      }),
      prisma.laporanWarga.count({
        where: {
          OR: [
            { rtId: { in: dapilRtIds } },
            { kelurahan: dapil3KelurahanWhere() },
            { kecamatan: dapil3KecamatanWhere() },
          ],
        },
      }),
      prisma.warga.count({
        where: { deletedAt: null, rt: { rw: { kelurahan: dapil3KelurahanWhere() } } },
      }),
      (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return prisma.laporanWarga.count({
          where: {
            createdAt: { gte: today },
            OR: [
              { rtId: { in: dapilRtIds } },
              { kelurahan: dapil3KelurahanWhere() },
              { kecamatan: dapil3KecamatanWhere() },
            ],
          },
        });
      })(),
      prisma.laporanWarga.findMany({
        where: {
          OR: [
            { rtId: { in: dapilRtIds } },
            { kelurahan: dapil3KelurahanWhere() },
            { kecamatan: dapil3KecamatanWhere() },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          kodeLaporan: true,
          kategori: true,
          status: true,
          urgencyLevel: true,
          createdAt: true,
          namaPelapor: true,
        },
      }),
    ]);

    return {
      summary: {
        totalKecamatan: kecamatan.length,
        kecamatanAktif,
        totalKelurahan,
        kelurahanAktif,
        totalKoordinator,
        totalLaporan,
        laporanHariIni,
        totalWarga,
      },
      recentLaporan,
      kecamatan,
    };
  });

  app.get('/summary', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const rtIds = await resolveVisibleRtIds(user);
    const wargaWhere: any = rtIds === null ? {} : rtIds.length === 0 ? { id: -1 } : { rtId: { in: rtIds } };
    const keluargaWhere: any = rtIds === null ? {} : rtIds.length === 0 ? { id: -1 } : { rtId: { in: rtIds } };
    const rtWhere: any = rtIds === null ? {} : rtIds.length === 0 ? { id: -1 } : { id: { in: rtIds } };
    const laporanWhere: any = await buildLaporanListWhere(user);
    const warmindoWhere: any = await warmindoOutletWhereForUser(user, rtIds);
    const wilayahKeyed: any = await buildWilayahKeyedListWhere(user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalWarga = await prisma.warga.count({ where: { ...wargaWhere, deletedAt: null } });
    const totalKK = await prisma.keluarga.count({ where: keluargaWhere });
    const totalRT = await prisma.rT.count({ where: rtWhere });
    const laporanHariIni = await prisma.laporanWarga.count({ where: { AND: [laporanWhere, { createdAt: { gte: today } }] } });
    const laporanCritical = await prisma.laporanWarga.count({
      where: { AND: [laporanWhere, { urgencyLevel: 'critical', status: { not: 'selesai' } }] },
    });
    const laporanBelumSelesai = await prisma.laporanWarga.count({
      where: { AND: [laporanWhere, { status: { notIn: ['selesai', 'ditolak'] } }] },
    });
    const warmindoAktif = await prisma.warmindoOutlet.count({ where: { AND: [warmindoWhere, { status: 'aktif' }] } });
    const totalBantuan = await prisma.bantuan.count();
    const bantuanAktif = await prisma.bantuan.count({ where: { aktif: true } });
    const openAlertWhere =
      Object.keys(wilayahKeyed).length === 0
        ? { status: { in: OPEN_OPERATIONAL_ALERT_STATUSES } }
        : { AND: [{ status: { in: OPEN_OPERATIONAL_ALERT_STATUSES } }, wilayahKeyed] };
    const aiAlerts = await prisma.operationalAlert.count({ where: openAlertWhere });
    const fairnessWhere =
      rtIds === null
        ? {}
        : rtIds.length === 0
          ? { id: -1 }
          : {
              OR: [
                { wilayahLevel: 'rt', wilayahId: { in: rtIds } },
                ...(user.kelurahanId ? [{ wilayahLevel: 'kelurahan', wilayahId: user.kelurahanId }] : []),
                ...(user.kecamatanId ? [{ wilayahLevel: 'kecamatan', wilayahId: user.kecamatanId }] : []),
                ...(user.kotaId ? [{ wilayahLevel: 'kota', wilayahId: user.kotaId }] : []),
              ],
            };
    const fairnessSnapshot = await (prisma as any).bantuanFairnessSnapshot.findFirst({
      where: fairnessWhere,
      orderBy: { calculatedAt: 'desc' },
    });
    const stressWhere =
      Object.keys(wilayahKeyed).length === 0
        ? { status: { in: ['open', 'monitoring'] } }
        : { AND: [{ status: { in: ['open', 'monitoring'] } }, wilayahKeyed] };
    const stressSignals = await (prisma as any).territorialStressSignal.findMany({
      where: stressWhere,
      orderBy: { score: 'desc' },
      take: 5,
    });
    const foodRisk = await (prisma as any).foodSecuritySnapshot.findFirst({ orderBy: { foodRiskScore: 'desc' } });
    const responseDelays = await (prisma as any).governmentResponse.findMany({ orderBy: { responseDelayHours: 'desc' }, take: 5 });
    const scopedOutlets = await prisma.warmindoOutlet.findMany({ where: warmindoWhere, select: { id: true } });
    const outletIdList = scopedOutlets.map((o) => o.id);
    const attendanceIssues =
      outletIdList.length === 0
        ? 0
        : await (prisma as any).warmindoAttendance.count({
            where: { warmindoId: { in: outletIdList }, status: { in: ['absent', 'late'] }, tanggal: { gte: today } },
          });

    const allRT = await prisma.rT.findMany({
      where: rtWhere,
      include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: { include: { kecamatan: true } } } } },
    });

    const rtKurang = allRT
      .filter((r) => r._count.warga < 10)
      .map((r) => ({
        id: r.id,
        nomor: r.nomor,
        jumlahWarga: r._count.warga,
        rw: r.rw.nomor,
        kelurahan: r.rw.kelurahan.nama,
        kecamatan: r.rw.kelurahan.kecamatan.nama,
      }))
      .slice(0, 15);

    const recentLaporan = await prisma.laporanWarga.findMany({
      where: laporanWhere,
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        kodeLaporan: true,
        namaPelapor: true,
        kategori: true,
        urgencyLevel: true,
        status: true,
        isEmergency: true,
        lokasiText: true,
        aiSummary: true,
        createdAt: true,
      },
    });

    const omzetHariIni =
      outletIdList.length === 0
        ? { _sum: { totalOmzet: 0, grossProfit: 0 } }
        : await prisma.warmindoTransaksi.aggregate({
            where: { warmindoId: { in: outletIdList }, tanggal: { gte: today } },
            _sum: { totalOmzet: true, grossProfit: true },
          });

    const anomalyRtWhere =
      rtIds === null ? {} : rtIds.length === 0 ? { id: -1 } : { rtId: { in: rtIds } };
    const openAnomalies = await prisma.bantuanAnomaly.count({
      where: { status: 'open', ...anomalyRtWhere },
    });
    const latestRtFairness =
      user.rtId != null && user.rtId !== ''
        ? await prisma.bantuanFairnessSnapshot.findFirst({
            where: { wilayahLevel: 'RT', wilayahId: Number(user.rtId) },
            orderBy: { calculatedAt: 'desc' },
          })
        : null;
    const fs = latestRtFairness?.fairnessScore;
    const bantuanRiskLevel =
      fs == null ? null : Number(fs) >= 75 ? 'aman' : Number(fs) >= 50 ? 'perhatian' : 'kritis';

    return {
      stats: {
        totalWarga,
        totalKK,
        totalRT,
        rtBelumLengkap: allRT.filter((r) => r._count.warga < 10).length,
        laporanHariIni,
        laporanCritical,
        laporanBelumSelesai,
        warmindoAktif,
        totalBantuan,
        bantuanAktif,
        aiAlerts,
        fairnessScore: fairnessSnapshot?.fairnessScore ?? 0,
        repeatedRecipients: fairnessSnapshot?.repeatedRecipients ?? 0,
        uncoveredHighRisk: fairnessSnapshot?.uncoveredHighRisk ?? 0,
        criticalTerritories: stressSignals.filter((s: any) => ['critical', 'high'].includes(s.severity)).length,
        foodRisk: foodRisk?.foodRiskScore ?? 0,
        maxResponseDelayHours: responseDelays[0]?.responseDelayHours ?? 0,
        passiveTerritories: stressSignals.filter(
          (s: any) => s.description?.toLowerCase().includes('pasif') || s.signalType?.includes('poverty'),
        ).length,
        staffAttendanceIssues: attendanceIssues,
        omzetHariIni: omzetHariIni._sum.totalOmzet ?? 0,
        labaHariIni: omzetHariIni._sum.grossProfit ?? 0,
      },
      fieldMetrics: { stressSignals, foodRisk, responseDelays },
      rtKurang,
      recentLaporan,
      bantuanAnomalies: openAnomalies,
      bantuanFairnessScore: latestRtFairness?.fairnessScore ?? null,
      bantuanRiskLevel,
    };
  });

  /** Dapil 3 — territorial intelligence (governance / finance). */
  app.get('/territorial-overview', { preHandler: adminIntelPre(app) }, async () => {
    const kotaCodes = [...DAPIL3_KOTA_KODES];
    const wargaDapilWhere = {
      deletedAt: null,
      rt: { rw: { kelurahan: dapil3KotaWhere() } },
    };
    const keluargaDapilWhere = { rt: { rw: { kelurahan: dapil3KotaWhere() } } };

    const dapilRtIds = (
      await prisma.rT.findMany({
        where: { rw: { kelurahan: dapil3KotaWhere() } },
        select: { id: true },
      })
    ).map((r) => r.id);
    const dapilKelIds = (
      await prisma.kelurahan.findMany({
        where: dapil3KotaWhere(),
        select: { id: true },
      })
    ).map((k) => k.id);
    const laporanDapilWhere = {
      OR: [
        { rtId: { in: dapilRtIds } },
        { kelurahanId: { in: dapilKelIds } },
        { kecamatan: { kota: { kode: { in: kotaCodes } } } },
      ],
    };

    const [
      totalKecamatan,
      totalKelurahan,
      totalRW,
      totalRT,
      totalWarga,
      totalKeluarga,
      wargaByStatus,
      keluargaByStatus,
      totalLaporan,
      laporanByStatus,
      laporanCritical,
      totalBantuan,
      bantuanAnomalies,
      totalWarmindo,
      warmindoAktif,
    ] = await Promise.all([
      prisma.kecamatan.count({ where: { kota: { kode: { in: kotaCodes } } } }),
      prisma.kelurahan.count({ where: dapil3KotaWhere() }),
      prisma.rW.count({ where: { kelurahan: dapil3KotaWhere() } }),
      prisma.rT.count({ where: { rw: { kelurahan: dapil3KotaWhere() } } }),
      prisma.warga.count({ where: wargaDapilWhere }),
      prisma.keluarga.count({ where: keluargaDapilWhere }),
      prisma.warga.groupBy({
        by: ['statusEkonomi'],
        _count: { id: true },
        where: wargaDapilWhere,
      }),
      prisma.keluarga.groupBy({
        by: ['statusEkonomi'],
        _count: { id: true },
        where: keluargaDapilWhere,
      }),
      prisma.laporanWarga.count({ where: laporanDapilWhere }),
      prisma.laporanWarga.groupBy({
        by: ['status'],
        _count: { id: true },
        where: laporanDapilWhere,
      }),
      prisma.laporanWarga.count({
        where: {
          AND: [
            laporanDapilWhere,
            { urgencyLevel: UrgencyLevel.critical },
            { status: { not: ReportStatus.selesai } },
          ],
        },
      }),
      prisma.bantuan.count({ where: { aktif: true } }),
      prisma.bantuanAnomaly.count({ where: { status: 'open' } }),
      prisma.warmindoOutlet.count(),
      prisma.warmindoOutlet.count({ where: { aktif: true, status: WarmindoStatus.aktif } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warmindoOmzetToday = await prisma.warmindoTransaksi.aggregate({
      where: { tanggal: { gte: today } },
      _sum: { totalOmzet: true, grossProfit: true },
    });

    const wargaVulnerable = wargaByStatus
      .filter((s) => ['sangat_miskin', 'miskin', 'rentan'].includes(String(s.statusEkonomi ?? '')))
      .reduce((sum, s) => sum + s._count.id, 0);

    return {
      territorial: {
        kecamatan: totalKecamatan,
        kelurahan: totalKelurahan,
        rw: totalRW,
        rt: totalRT,
      },
      populasi: {
        totalWarga,
        totalKeluarga,
        byStatusEkonomi: wargaByStatus,
        keluargaByStatusEkonomi: keluargaByStatus,
        wargaVulnerable,
      },
      laporan: {
        total: totalLaporan,
        byStatus: laporanByStatus,
        critical: laporanCritical,
      },
      bantuan: {
        programAktif: totalBantuan,
        openAnomalies: bantuanAnomalies,
      },
      warmindo: {
        totalOutlets: totalWarmindo,
        aktifOutlets: warmindoAktif,
        omzetHariIni: warmindoOmzetToday._sum.totalOmzet ?? 0,
        grossProfitHariIni: warmindoOmzetToday._sum.grossProfit ?? 0,
      },
      generatedAt: new Date().toISOString(),
    };
  });

  app.get('/kota-breakdown', { preHandler: adminIntelPre(app) }, async () => {
    const kotaList = [
      { nama: 'Jakarta Utara', kode: '3172' },
      { nama: 'Jakarta Barat', kode: '3173' },
      { nama: 'Kepulauan Seribu', kode: '3101' },
    ];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await Promise.all(
      kotaList.map(async ({ nama, kode }) => {
        const kotaWhere = { kecamatan: { kota: { kode } } };
        const rtIds = (
          await prisma.rT.findMany({
            where: { rw: { kelurahan: kotaWhere } },
            select: { id: true },
          })
        ).map((r) => r.id);
        const kkIds = (
          await prisma.keluarga.findMany({
            where: { rtId: { in: rtIds } },
            select: { id: true },
          })
        ).map((k) => k.id);
        const laporanKotaWhere = {
          OR: [
            { rtId: { in: rtIds } },
            { kelurahanId: { in: (await prisma.kelurahan.findMany({ where: kotaWhere, select: { id: true } })).map((x) => x.id) } },
            { kecamatan: { kota: { kode } } },
          ],
        };

        const warmindoIds = (
          await prisma.warmindoOutlet.findMany({
            where: { kelurahan: kotaWhere },
            select: { id: true },
          })
        ).map((o) => o.id);

        const [
          kelurahan,
          rw,
          rt,
          warga,
          keluarga,
          warmindo,
          laporanOpen,
          bantuanAnomaliesKota,
          omzetAgg,
        ] = await Promise.all([
          prisma.kelurahan.count({ where: kotaWhere }),
          prisma.rW.count({ where: { kelurahan: kotaWhere } }),
          prisma.rT.count({ where: { rw: { kelurahan: kotaWhere } } }),
          prisma.warga.count({
            where: { deletedAt: null, rt: { rw: { kelurahan: kotaWhere } } },
          }),
          prisma.keluarga.count({ where: { rt: { rw: { kelurahan: kotaWhere } } } }),
          prisma.warmindoOutlet.count({ where: { kelurahan: kotaWhere } }),
          prisma.laporanWarga.count({
            where: {
              AND: [
                laporanKotaWhere,
                { status: { in: [ReportStatus.baru, ReportStatus.diproses] } },
              ],
            },
          }),
          prisma.bantuanAnomaly.count({
            where: {
              status: 'open',
              OR: [{ rtId: { in: rtIds } }, { keluargaId: { in: kkIds } }],
            },
          }),
          warmindoIds.length
            ? prisma.warmindoTransaksi.aggregate({
                where: { warmindoId: { in: warmindoIds }, tanggal: { gte: today } },
                _sum: { totalOmzet: true },
              })
            : Promise.resolve({ _sum: { totalOmzet: 0 as number | null } }),
        ]);

        return {
          kode,
          nama,
          kelurahan,
          rw,
          rt,
          warga,
          keluarga,
          warmindo,
          warmindoOmzetHariIni: omzetAgg._sum.totalOmzet ?? 0,
          laporanOpen,
          bantuanAnomalies: bantuanAnomaliesKota,
        };
      }),
    );

    return rows;
  });

  app.get('/alerts', { preHandler: adminIntelPre(app) }, async () => {
    const alerts = await prisma.operationalAlert.findMany({
      where: { status: { in: [OperationalAlertStatus.open, OperationalAlertStatus.acknowledged] } },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dapilRtIds = (
      await prisma.rT.findMany({
        where: { rw: { kelurahan: dapil3KotaWhere() } },
        select: { id: true },
      })
    ).map((r) => r.id);

    const dapilKelIdsForAlerts = (
      await prisma.kelurahan.findMany({
        where: dapil3KotaWhere(),
        select: { id: true },
      })
    ).map((k) => k.id);

    const openAnomalyCount = await prisma.bantuanAnomaly.count({ where: { status: 'open' } });
    const criticalLaporan = await prisma.laporanWarga.count({
      where: {
        AND: [
          {
            OR: [
              { rtId: { in: dapilRtIds } },
              { kelurahanId: { in: dapilKelIdsForAlerts } },
              { kecamatan: { kota: { kode: { in: [...DAPIL3_KOTA_KODES] } } } },
            ],
          },
          { urgencyLevel: UrgencyLevel.critical },
          { status: { not: ReportStatus.selesai } },
        ],
      },
    });

    const lowStockOutlets = await prisma.warmindoOutlet.findMany({
      where: { aktif: true, status: WarmindoStatus.aktif },
      select: {
        id: true,
        kodeOutlet: true,
        namaOutlet: true,
        inventory: { select: { stokSaatIni: true, stokMinimum: true } },
      },
    });
    const lowStockRows = lowStockOutlets
      .map((o) => ({
        outletId: o.id,
        kodeOutlet: o.kodeOutlet,
        namaOutlet: o.namaOutlet,
        lowCount: o.inventory.filter((i) => i.stokMinimum > 0 && i.stokSaatIni <= i.stokMinimum).length,
      }))
      .filter((r) => r.lowCount > 0);

    const dynamicAlerts: {
      id: string;
      severity: string;
      judul: string;
      deskripsi: string;
      source: string;
    }[] = [];
    if (openAnomalyCount > 0) {
      dynamicAlerts.push({
        id: 'dyn-bantuan-anomaly',
        severity: 'high',
        judul: 'Anomali bantuan terbuka',
        deskripsi: `${openAnomalyCount} anomali program bantuan memerlukan tindak lanjut.`,
        source: 'bantuan_anomaly',
      });
    }
    if (criticalLaporan > 0) {
      dynamicAlerts.push({
        id: 'dyn-laporan-critical',
        severity: 'critical',
        judul: 'Laporan kritis belum selesai',
        deskripsi: `${criticalLaporan} laporan dengan urgensi critical belum diselesaikan (Dapil 3).`,
        source: 'laporan_warga',
      });
    }
    for (const row of lowStockRows.slice(0, 8)) {
      dynamicAlerts.push({
        id: `dyn-lowstock-${row.outletId}`,
        severity: 'medium',
        judul: `Stok rendah: ${row.namaOutlet}`,
        deskripsi: `${row.lowCount} item bahan di bawah stok minimum (${row.kodeOutlet}).`,
        source: 'warmindo_inventory',
      });
    }

    const totalOpen =
      alerts.filter((a) => a.status === OperationalAlertStatus.open).length + dynamicAlerts.length;

    return { alerts, dynamicAlerts, totalOpen };
  });

  app.patch('/alerts/:id/acknowledge', { preHandler: adminIntelPre(app) }, async (req, reply) => {
    const id = Number((req.params as { id?: string }).id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: 'id tidak valid' });
    const user = req.user as any;
    await prisma.operationalAlert.updateMany({
      where: { id, status: OperationalAlertStatus.open },
      data: {
        status: OperationalAlertStatus.acknowledged,
        acknowledgedAt: new Date(),
        acknowledgedBy: user.userId ?? null,
      },
    });
    return { ok: true };
  });

  app.get('/warmindo-network', { preHandler: adminIntelPre(app) }, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date(today);
    endToday.setHours(23, 59, 59, 999);

    const outlets = await prisma.warmindoOutlet.findMany({
      where: { aktif: true, status: WarmindoStatus.aktif },
      include: {
        kelurahan: { include: { kecamatan: { include: { kota: true } } } },
        inventory: { select: { stokSaatIni: true, stokMinimum: true } },
      },
    });
    const outletIds = outlets.map((o) => o.id);
    const trxRows =
      outletIds.length === 0
        ? []
        : await prisma.warmindoTransaksi.groupBy({
            by: ['warmindoId'],
            where: { warmindoId: { in: outletIds }, tanggal: { gte: today, lte: endToday } },
            _sum: { totalOmzet: true },
          });
    const omzetByOutlet = new Map(trxRows.map((t) => [t.warmindoId, t._sum.totalOmzet ?? 0]));

    const outletRows = outlets.map((o) => {
      const omzetHariIni = omzetByOutlet.get(o.id) ?? 0;
      const target = o.targetOmzetHarian ?? 0;
      const achievementPct = target > 0 ? (omzetHariIni / target) * 100 : omzetHariIni > 0 ? 100 : 0;
      const lowStockCount = o.inventory.filter((i) => i.stokMinimum > 0 && i.stokSaatIni <= i.stokMinimum).length;
      return {
        id: o.id,
        kodeOutlet: o.kodeOutlet,
        namaOutlet: o.namaOutlet,
        kelurahan: o.kelurahan?.nama ?? '—',
        kecamatan: o.kelurahan?.kecamatan?.nama ?? '—',
        kota: o.kelurahan?.kecamatan?.kota?.nama ?? '—',
        omzetHariIni,
        targetOmzet: target,
        achievementPct,
        lowStockCount,
        status: o.status,
      };
    });

    outletRows.sort((a, b) => a.achievementPct - b.achievementPct);

    const totalOmzetHariIni = outletRows.reduce((s, r) => s + r.omzetHariIni, 0);
    const withTarget = outletRows.filter((r) => r.targetOmzet > 0);
    const avgAchievementPct = withTarget.length
      ? withTarget.reduce((s, r) => s + r.achievementPct, 0) / withTarget.length
      : outletRows.length
        ? outletRows.reduce((s, r) => s + r.achievementPct, 0) / outletRows.length
        : 0;
    const outletMencapaiTarget = outletRows.filter((r) => r.achievementPct >= 100).length;
    const outletPerhatian = outletRows.filter((r) => r.achievementPct < 75).length;

    return {
      totalOutlets: outlets.length,
      totalOmzetHariIni,
      avgAchievementPct,
      outletMencapaiTarget,
      outletPerhatian,
      outlets: outletRows,
    };
  });
}
