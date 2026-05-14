import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: [app.authenticate] }, async (req) => {
    const user = req.user as any;
    const rtIds = await scopedRtIds(user);
    const wargaWhere: any = rtIds ? { rtId: { in: rtIds } } : {};
    const keluargaWhere: any = rtIds ? { rtId: { in: rtIds } } : {};
    const laporanWhere: any = rtIds ? { rtId: { in: rtIds } } : {};
    const rtWhere: any = rtIds ? { id: { in: rtIds } } : {};
    const warmindoWhere: any = user.warmindoId ? { id: user.warmindoId } : rtIds ? { rtId: { in: rtIds } } : {};
    const today = new Date(); today.setHours(0,0,0,0);

    const [totalWarga, totalKK, totalRT, laporanHariIni, laporanCritical, laporanBelumSelesai, warmindoAktif, totalBantuan, bantuanAktif, aiAlerts, fairnessSnapshot, stressSignals, foodRisk, responseDelays, attendanceIssues] = await Promise.all([
      prisma.warga.count({ where: wargaWhere }),
      prisma.keluarga.count({ where: keluargaWhere }),
      prisma.rT.count({ where: rtWhere }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, createdAt: { gte: today } } }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, urgencyLevel: 'critical', status: { not: 'selesai' } } }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, status: { notIn: ['selesai','ditolak'] } } }),
      prisma.warmindoOutlet.count({ where: { ...warmindoWhere, status: 'aktif' } }),
      prisma.bantuan.count(),
      prisma.bantuan.count({ where: { aktif: true } }),
      prisma.operationalAlert.count({ where: { status: { in: ['open','acknowledged'] } } }),
      (prisma as any).bantuanFairnessSnapshot.findFirst({ orderBy: { calculatedAt: 'desc' } }),
      (prisma as any).territorialStressSignal.findMany({ where: { status: { in: ['open','monitoring'] } }, orderBy: { score: 'desc' }, take: 5 }),
      (prisma as any).foodSecuritySnapshot.findFirst({ orderBy: { foodRiskScore: 'desc' } }),
      (prisma as any).governmentResponse.findMany({ orderBy: { responseDelayHours: 'desc' }, take: 5 }),
      (prisma as any).warmindoAttendance.count({ where: { status: { in: ['absent','late'] }, tanggal: { gte: today } } }),
    ]);

    const allRT = await prisma.rT.findMany({
      where: rtWhere,
      include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: { include: { kecamatan: true } } } } },
    });

    const rtKurang = allRT.filter(r => r._count.warga < 10).map(r => ({
      id: r.id, nomor: r.nomor, jumlahWarga: r._count.warga,
      rw: r.rw.nomor, kelurahan: r.rw.kelurahan.nama, kecamatan: r.rw.kelurahan.kecamatan.nama,
    })).slice(0, 15);

    const recentLaporan = await prisma.laporanWarga.findMany({
      where: laporanWhere, orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }], take: 10,
      select: { id:true, kodeLaporan:true, namaPelapor:true, kategori:true, urgencyLevel:true, status:true, isEmergency:true, lokasiText:true, aiSummary:true, createdAt:true },
    });

    const scopedOutlets = await prisma.warmindoOutlet.findMany({ where: warmindoWhere, select: { id: true } });
    const omzetHariIni = await prisma.warmindoTransaksi.aggregate({
      where: { warmindoId: { in: scopedOutlets.map(o => o.id) }, tanggal: { gte: today } }, _sum: { totalOmzet: true, grossProfit: true },
    });

    return {
      stats: {
        totalWarga, totalKK, totalRT,
        rtBelumLengkap: allRT.filter(r => r._count.warga < 10).length,
        laporanHariIni, laporanCritical, laporanBelumSelesai,
        warmindoAktif, totalBantuan, bantuanAktif, aiAlerts,
        fairnessScore: fairnessSnapshot?.fairnessScore ?? 0,
        repeatedRecipients: fairnessSnapshot?.repeatedRecipients ?? 0,
        uncoveredHighRisk: fairnessSnapshot?.uncoveredHighRisk ?? 0,
        criticalTerritories: stressSignals.filter((s: any) => ['critical','high'].includes(s.severity)).length,
        foodRisk: foodRisk?.foodRiskScore ?? 0,
        maxResponseDelayHours: responseDelays[0]?.responseDelayHours ?? 0,
        passiveTerritories: stressSignals.filter((s: any) => s.description?.toLowerCase().includes('pasif') || s.signalType?.includes('poverty')).length,
        staffAttendanceIssues: attendanceIssues,
        omzetHariIni: omzetHariIni._sum.totalOmzet ?? 0,
        labaHariIni: omzetHariIni._sum.grossProfit ?? 0,
      },
      fieldMetrics: { stressSignals, foodRisk, responseDelays },
      rtKurang, recentLaporan,
    };
  });
}

async function scopedRtIds(user: any): Promise<number[] | null> {
  if (!user || ['admin_pusat','auditor','finance_admin'].includes(user.role)) return null;
  if (user.rtId) return [user.rtId];
  if (user.rwId) {
    const rts = await prisma.rT.findMany({ where: { rwId: user.rwId }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  if (user.kelurahanId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahanId: user.kelurahanId } }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  if (user.kecamatanId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahan: { kecamatanId: user.kecamatanId } } }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  if (user.kotaId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahan: { kecamatan: { kotaId: user.kotaId } } } }, select: { id: true } });
    return rts.map(rt => rt.id);
  }
  if (user.warmindoId) return [];
  return [];
}
