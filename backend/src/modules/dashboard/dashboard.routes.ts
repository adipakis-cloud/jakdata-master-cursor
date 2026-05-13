import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { getLaporanScopeWhere, getResidentScopeWhere, getRtScopeWhere, getWarmindoScopeWhere } from '../security/security';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: [app.authenticate] }, async (req) => {
    const user = req.user as any;
    const wargaWhere = getResidentScopeWhere(user);
    const keluargaWhere = getResidentScopeWhere(user);
    const rtWhere = getRtScopeWhere(user);
    const laporanWhere = getLaporanScopeWhere(user);
    const warmindoWhere = getWarmindoScopeWhere(user);
    const today = new Date(); today.setHours(0,0,0,0);
    const omzetWhere: any = { tanggal: { gte: today } };
    if (Object.keys(warmindoWhere).length > 0) omzetWhere.warmindo = { is: warmindoWhere };

    const [totalWarga, totalKK, totalRT, laporanHariIni, laporanCritical, laporanBelumSelesai, warmindoAktif] = await Promise.all([
      prisma.warga.count({ where: wargaWhere }),
      prisma.keluarga.count({ where: keluargaWhere }),
      prisma.rT.count({ where: rtWhere }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, createdAt: { gte: today } } }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, urgencyLevel: 'critical', status: { not: 'selesai' } } }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, status: { notIn: ['selesai','ditolak'] } } }),
      prisma.warmindoOutlet.count({ where: { ...warmindoWhere, status: 'aktif' } }),
    ]);

    const allRT = await prisma.rT.findMany({
      where: rtWhere,
      include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: { include: { kecamatan: true } } } } },
    });

    const rtKurang = allRT.filter(r => r._count.warga < r.targetWarga).map(r => ({
      id: r.id, nomor: r.nomor, jumlahWarga: r._count.warga,
      targetWarga: r.targetWarga, rw: r.rw.nomor, kelurahan: r.rw.kelurahan.nama, kecamatan: r.rw.kelurahan.kecamatan.nama,
    })).slice(0, 15);

    const recentLaporan = await prisma.laporanWarga.findMany({
      where: laporanWhere, orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }], take: 10,
      select: { id:true, kodeLaporan:true, namaPelapor:true, kategori:true, urgencyLevel:true, status:true, isEmergency:true, lokasiText:true, aiSummary:true, createdAt:true },
    });

    const omzetHariIni = await prisma.warmindoTransaksi.aggregate({
      where: omzetWhere, _sum: { totalOmzet: true, grossProfit: true },
    });

    return {
      stats: { totalWarga, totalKK, totalRT, rtBelumLengkap: allRT.filter(r => r._count.warga < r.targetWarga).length, laporanHariIni, laporanCritical, laporanBelumSelesai, warmindoAktif, omzetHariIni: omzetHariIni._sum.totalOmzet ?? 0, labaHariIni: omzetHariIni._sum.grossProfit ?? 0 },
      rtKurang, recentLaporan,
    };
  });
}
