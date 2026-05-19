import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { scoringRoutes } from './scoring.routes';
import {
  buildLaporanListWhere,
  buildWargaListWhere,
  canAccessKoordinatorMobileApi,
  isMobileFieldRole,
  resolveVisibleRtIds,
} from '../security/security';

async function requireKoordinatorMobile(req: any, reply: any) {
  const u = req.user as any;
  if (!canAccessKoordinatorMobileApi(u.role)) {
    return reply.code(403).send({ error: 'Akses khusus koordinator lapangan atau admin/auditor.' });
  }
}

export async function koordinatorRoutes(app: FastifyInstance) {
  await app.register(scoringRoutes, { prefix: '/scoring' });

  /**
   * Single mobile home: scope + allowed menus + key counts + recent laporan.
   * Replaces legacy wilayah_assignments SQL (table may not exist).
   */
  app.get('/mobile', { preHandler: [app.authenticate, requireKoordinatorMobile] }, async (req, reply) => {
    const jwt = req.user as any;
    const user = await prisma.user.findUnique({
      where: { id: jwt.sub },
      include: {
        kecamatan: { include: { kota: { select: { nama: true } } } },
        kelurahan: { include: { kecamatan: { select: { nama: true } } } },
        rw: { include: { kelurahan: { select: { nama: true } } } },
        rt: { include: { rw: { include: { kelurahan: { select: { nama: true } } } } } },
      },
    });
    if (!user) return reply.code(404).send({ error: 'Pengguna tidak ditemukan' });

    const rtIds = await resolveVisibleRtIds(user);
    const lapBase = await buildLaporanListWhere(user);
    const wargaBase = await buildWargaListWhere(user);

    const [laporanOpen, laporanCritical, wargaCount, recentLaporan] = await Promise.all([
      prisma.laporanWarga.count({
        where: { ...lapBase, status: { notIn: ['selesai', 'ditolak'] } },
      }),
      prisma.laporanWarga.count({
        where: {
          ...lapBase,
          OR: [{ urgencyLevel: 'critical' }, { isEmergency: true }],
          status: { notIn: ['selesai', 'ditolak'] },
        },
      }),
      prisma.warga.count({ where: { ...wargaBase, deletedAt: null } }),
      prisma.laporanWarga.findMany({
        where: lapBase,
        orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          kodeLaporan: true,
          kategori: true,
          urgencyLevel: true,
          status: true,
          isEmergency: true,
          createdAt: true,
          rtId: true,
          kelurahanId: true,
        },
      }),
    ]);

    const scopeLabel =
      user.role === 'koordinator_kecamatan'
        ? user.kecamatan?.nama
        : user.role === 'koordinator_kelurahan'
          ? user.kelurahan?.nama
          : user.role === 'koordinator_rw'
            ? `RW ${user.rw?.nomor ?? ''} — ${user.rw?.kelurahan?.nama ?? ''}`
            : user.role === 'koordinator_rt' || user.role === 'petugas_lapangan'
              ? `RT ${user.rt?.nomor ?? ''} / RW ${user.rt?.rw?.nomor ?? ''}`
              : user.role === 'admin_pusat'
                ? 'Nasional'
                : user.role === 'auditor'
                  ? 'Audit (baca)'
                  : '-';

    const governance = user.role === 'admin_pusat' || user.role === 'auditor' || user.role === 'finance_admin';

    return {
      role: user.role,
      governance,
      field: isMobileFieldRole(user.role),
      scope: {
        label: scopeLabel,
        kecamatanId: user.kecamatanId,
        kelurahanId: user.kelurahanId,
        rwId: user.rwId,
        rtId: user.rtId,
        rtCount: rtIds === null ? null : rtIds.length,
      },
      visibility: {
        laporan: governance || isMobileFieldRole(user.role),
        warga: governance || isMobileFieldRole(user.role),
        bantuan: governance || isMobileFieldRole(user.role),
        warmindo: user.role === 'manager_warmindo' || user.role === 'kasir_warmindo' || governance,
        triaseLaporan: user.role === 'admin_pusat' || isMobileFieldRole(user.role),
      },
      stats: {
        laporanBelumSelesai: laporanOpen,
        laporanMendesak: laporanCritical,
        wargaTerdata: wargaCount,
      },
      recentLaporan,
    };
  });
}
