import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { dapil3KecamatanWhere, dapil3KelurahanWhere, KOORDINATOR_FIELD_ROLES } from '../../lib/dapil3';
import { scoringRoutes } from './scoring.routes';
import {
  buildLaporanListWhere,
  buildWargaListWhere,
  canAccessKoordinatorMobileApi,
  isMobileFieldRole,
  resolveVisibleRtIds,
} from '../security/security';

const KOORD_ROLES = [...KOORDINATOR_FIELD_ROLES];

async function requireKoordinatorMobile(req: any, reply: any) {
  const u = req.user as any;
  if (!canAccessKoordinatorMobileApi(u.role)) {
    return reply.code(403).send({ error: 'Akses khusus koordinator lapangan atau admin/auditor.' });
  }
}

function requireGovernanceRead(role: string) {
  return ['admin_pusat', 'admin_kota', 'auditor', 'finance_admin'].includes(role);
}

function levelFromRole(role: string): string {
  if (role === 'koordinator_kecamatan') return 'kecamatan';
  if (role === 'koordinator_kelurahan') return 'kelurahan';
  if (role === 'koordinator_rw') return 'rw';
  return 'rt';
}

function wilayahNamaFromUser(u: {
  kecamatan?: { nama: string } | null;
  kelurahan?: { nama: string; kecamatan?: { nama: string } | null } | null;
  rw?: { nomor: string; kelurahan?: { nama: string } | null } | null;
  rt?: { nomor: string; rw?: { nomor: string; kelurahan?: { nama: string } | null } | null } | null;
}): string {
  if (u.kecamatan?.nama) return u.kecamatan.nama;
  if (u.kelurahan?.nama) {
    const kec = u.kelurahan.kecamatan?.nama;
    return kec ? `${u.kelurahan.nama}, ${kec}` : u.kelurahan.nama;
  }
  if (u.rw) return `RW ${u.rw.nomor} — ${u.rw.kelurahan?.nama ?? ''}`;
  if (u.rt) return `RT ${u.rt.nomor} / RW ${u.rt.rw?.nomor ?? ''}`;
  return '—';
}

function mapUserToAssignment(u: any) {
  return {
    id: u.id,
    level: levelFromRole(u.role),
    status: u.aktif ? 'aktif' : 'nonaktif',
    kecamatanId: u.kecamatanId,
    kelurahanId: u.kelurahanId,
    user: { nama: u.nama, role: u.role, email: u.email, noHp: u.noHp },
    wilayahNama: wilayahNamaFromUser(u),
  };
}

async function listKoordinators(query: { kecamatanId?: number }) {
  const where: any = {
    aktif: true,
    role: { in: KOORD_ROLES },
  };

  if (query.kecamatanId) {
    const kecId = query.kecamatanId;
    where.OR = [
      { kecamatanId: kecId },
      { kelurahan: { kecamatanId: kecId } },
      { rw: { kelurahan: { kecamatanId: kecId } } },
      { rt: { rw: { kelurahan: { kecamatanId: kecId } } } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      kecamatan: { select: { id: true, nama: true } },
      kelurahan: { select: { id: true, nama: true, kecamatan: { select: { id: true, nama: true } } } },
      rw: { select: { id: true, nomor: true, kelurahan: { select: { id: true, nama: true } } } },
      rt: { select: { id: true, nomor: true, rw: { select: { nomor: true, kelurahan: { select: { nama: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return users.map(mapUserToAssignment);
}

export async function koordinatorRoutes(app: FastifyInstance) {
  await app.register(scoringRoutes, { prefix: '/scoring' });

  async function requireGovernance(req: any, reply: any) {
    const jwt = req.user as any;
    if (!requireGovernanceRead(jwt.role)) {
      return reply.code(403).send({ error: 'Akses governance diperlukan.' });
    }
  }

  /** Daftar koordinator aktif (governance dashboard). */
  const listHandler = async (req: any) => {
    const q = req.query as { kecamatanId?: string };
    const kecamatanId = q.kecamatanId ? Number(q.kecamatanId) : undefined;
    return listKoordinators(Number.isFinite(kecamatanId) ? { kecamatanId } : {});
  };

  app.get('/', { preHandler: [app.authenticate, requireGovernance] }, listHandler);
  app.get('/aktif', { preHandler: [app.authenticate, requireGovernance] }, listHandler);

  /** Wilayah tanpa koordinator pada level tertentu. */
  app.get('/kosong', { preHandler: [app.authenticate, requireGovernance] }, async (req) => {
    const { level = 'kecamatan', kecamatanId } = req.query as { level?: string; kecamatanId?: string };
    const kecFilter = kecamatanId ? Number(kecamatanId) : undefined;

    if (level === 'kelurahan') {
      const kelurahanList = await prisma.kelurahan.findMany({
        where: {
          ...dapil3KelurahanWhere(),
          ...(Number.isFinite(kecFilter) ? { kecamatanId: kecFilter } : {}),
        },
        include: { kecamatan: { include: { kota: { select: { nama: true } } } } },
        orderBy: { nama: 'asc' },
      });
      const withKoord = await prisma.user.findMany({
        where: { aktif: true, role: 'koordinator_kelurahan', kelurahanId: { not: null } },
        select: { kelurahanId: true },
      });
      const covered = new Set(withKoord.map((u) => u.kelurahanId));
      return kelurahanList
        .filter((k) => !covered.has(k.id))
        .map((k) => ({
          id: k.id,
          nama: k.nama,
          kecamatan: k.kecamatan.nama,
          kota: k.kecamatan.kota.nama,
        }));
    }

    const kecamatanList = await prisma.kecamatan.findMany({
      where: dapil3KecamatanWhere(),
      include: { kota: { select: { nama: true } } },
      orderBy: [{ kota: { nama: 'asc' } }, { nama: 'asc' }],
    });
    const withKoord = await prisma.user.findMany({
      where: { aktif: true, role: 'koordinator_kecamatan', kecamatanId: { not: null } },
      select: { kecamatanId: true },
    });
    const covered = new Set(withKoord.map((u) => u.kecamatanId));
    return kecamatanList
      .filter((k) => !covered.has(k.id))
      .map((k) => ({
        id: k.id,
        nama: k.nama,
        kecamatan: k.nama,
        kota: k.kota.nama,
      }));
  });

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
