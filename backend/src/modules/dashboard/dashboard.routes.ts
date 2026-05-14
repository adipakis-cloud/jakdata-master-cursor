import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/summary', { preHandler: [app.authenticate] }, async (req) => {
    const user = req.user as any;
    const wargaWhere: any = {};
    const laporanWhere: any = {};
    if (user.role !== 'admin_pusat' && user.rtId) {
      wargaWhere.rtId = user.rtId;
      laporanWhere.rtId = user.rtId;
    }
    const today = new Date(); today.setHours(0,0,0,0);

    const [totalWarga, totalKK, totalRT, laporanHariIni, laporanCritical, laporanBelumSelesai, warmindoAktif, totalBantuan, bantuanAktif, aiAlerts] = await Promise.all([
      prisma.warga.count({ where: wargaWhere }),
      prisma.keluarga.count(),
      prisma.rT.count(),
      prisma.laporanWarga.count({ where: { ...laporanWhere, createdAt: { gte: today } } }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, urgencyLevel: 'critical', status: { not: 'selesai' } } }),
      prisma.laporanWarga.count({ where: { ...laporanWhere, status: { notIn: ['selesai','ditolak'] } } }),
      prisma.warmindoOutlet.count({ where: { status: 'aktif' } }),
      prisma.bantuan.count(),
      prisma.bantuan.count({ where: { aktif: true } }),
      prisma.operationalAlert.count({ where: { status: { in: ['open','acknowledged'] } } }),
    ]);

    const allRT = await prisma.rT.findMany({
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

    const omzetHariIni = await prisma.warmindoTransaksi.aggregate({
      where: { tanggal: { gte: today } }, _sum: { totalOmzet: true, grossProfit: true },
    });

    return {
      stats: { totalWarga, totalKK, totalRT, rtBelumLengkap: allRT.filter(r => r._count.warga < 10).length, laporanHariIni, laporanCritical, laporanBelumSelesai, warmindoAktif, totalBantuan, bantuanAktif, aiAlerts, omzetHariIni: omzetHariIni._sum.totalOmzet ?? 0, labaHariIni: omzetHariIni._sum.grossProfit ?? 0 },
      rtKurang, recentLaporan,
    };
  });
}
