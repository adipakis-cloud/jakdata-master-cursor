import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import {
  hitungSkorKoordinator,
  KOORDINATOR_SCORING_ROLES,
} from '../../lib/koordinatorScoring';
import { isMobileFieldRole } from '../security/security';

function requireAdminPusat(role: string) {
  return role === 'admin_pusat';
}

function requireLeaderboardAccess(role: string) {
  return role === 'admin_pusat' || role === 'admin_kota' || role === 'auditor';
}

function requireWilayahSummaryAccess(role: string) {
  return role === 'admin_pusat' || role === 'admin_kota';
}

function formatWilayah(user: {
  role: string;
  rt?: { nomor: string; rw?: { nomor: string; kelurahan?: { nama: string } } } | null;
  rw?: { nomor: string; kelurahan?: { nama: string } } | null;
  kelurahan?: { nama: string } | null;
  kecamatan?: { nama: string } | null;
}): string {
  if (user.rt) {
    const kel = user.rt.rw?.kelurahan?.nama ?? '';
    return `RT ${user.rt.nomor} / RW ${user.rt.rw?.nomor ?? '—'}${kel ? ` — ${kel}` : ''}`;
  }
  if (user.rw) return `RW ${user.rw.nomor} — ${user.rw.kelurahan?.nama ?? ''}`;
  if (user.kelurahan) return `Kel. ${user.kelurahan.nama}`;
  if (user.kecamatan) return `Kec. ${user.kecamatan.nama}`;
  return '—';
}

async function persistScoring(userId: number) {
  const hasil = await hitungSkorKoordinator(userId, prisma);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      kinerjaSkor: hasil.skor,
      kinerjaBintang: hasil.bintang,
      kinerjaLevel: hasil.level,
      totalWargaInput: hasil.totalWargaInput,
      totalLaporanInput: hasil.totalLaporanInput,
      dataQualityScore: hasil.dataQualityScore,
      lastActivityAt: user?.lastLoginAt ?? new Date(),
      skorUpdatedAt: new Date(),
    },
  });

  return hasil;
}

export async function scoringRoutes(app: FastifyInstance) {
  app.post(
    '/recalculate',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const jwt = req.user as { sub: number; role: string };
      if (!requireAdminPusat(jwt.role)) {
        return reply.code(403).send({ success: false, message: 'Hanya admin pusat' });
      }

      const body = (req.body ?? {}) as { userId?: number };
      const userIds: number[] = body.userId
        ? [body.userId]
        : (
            await prisma.user.findMany({
              where: { role: { in: [...KOORDINATOR_SCORING_ROLES] }, aktif: true },
              select: { id: true },
            })
          ).map((u) => u.id);

      let processed = 0;
      let sumSkor = 0;
      const topPerformers: { userId: number; skor: number; level: string }[] = [];

      for (const id of userIds) {
        const hasil = await persistScoring(id);
        processed += 1;
        sumSkor += hasil.skor;
        topPerformers.push({ userId: id, skor: hasil.skor, level: hasil.level });
        if (processed % 50 === 0) {
          console.log(`[Scoring] Progress: ${processed}/${userIds.length}`);
        }
      }

      topPerformers.sort((a, b) => b.skor - a.skor);

      return {
        success: true,
        processed,
        avgSkor: processed > 0 ? Math.round(sumSkor / processed) : 0,
        topPerformers: topPerformers.slice(0, 10),
      };
    },
  );

  app.get(
    '/leaderboard',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const jwt = req.user as { sub: number; role: string };
      if (!requireLeaderboardAccess(jwt.role)) {
        return reply.code(403).send({ success: false, message: 'Akses ditolak' });
      }

      const q = req.query as {
        kecamatanId?: string;
        kelurahanId?: string;
        level?: string;
        limit?: string;
        page?: string;
        search?: string;
      };

      const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));
      const page = Math.max(1, Number(q.page ?? 1));
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        role: { in: [...KOORDINATOR_SCORING_ROLES] },
        aktif: true,
      };

      if (q.kecamatanId) where.kecamatanId = Number(q.kecamatanId);
      if (q.kelurahanId) where.kelurahanId = Number(q.kelurahanId);
      if (q.level) where.kinerjaLevel = q.level;
      if (q.search?.trim()) {
        where.OR = [
          { nama: { contains: q.search.trim(), mode: 'insensitive' } },
          { email: { contains: q.search.trim(), mode: 'insensitive' } },
        ];
      }

      const [totalKoordinator, users, allForStats] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: [{ kinerjaSkor: 'desc' }, { nama: 'asc' }],
          skip,
          take: limit,
          include: {
            rt: {
              include: {
                rw: { include: { kelurahan: { select: { nama: true } } } },
              },
            },
            rw: { include: { kelurahan: { select: { nama: true } } } },
            kelurahan: { select: { nama: true } },
            kecamatan: { select: { nama: true } },
          },
        }),
        prisma.user.findMany({
          where: {
            role: { in: [...KOORDINATOR_SCORING_ROLES] },
            aktif: true,
            ...(q.kecamatanId ? { kecamatanId: Number(q.kecamatanId) } : {}),
          },
          select: { kinerjaSkor: true, kinerjaLevel: true },
        }),
      ]);

      const data = await Promise.all(
        users.map(async (u, idx) => {
          const hasil = await hitungSkorKoordinator(u.id, prisma);
          return {
            rank: skip + idx + 1,
            id: u.id,
            nama: u.nama,
            email: u.email,
            role: u.role,
            wilayah: formatWilayah(u),
            kinerjaSkor: u.kinerjaSkor,
            kinerjaBintang: u.kinerjaBintang,
            kinerjaLevel: u.kinerjaLevel,
            totalWargaInput: u.totalWargaInput,
            totalLaporanInput: u.totalLaporanInput,
            lastActivityAt: u.lastActivityAt,
            komponen: hasil.komponen,
            rekomendasi: hasil.rekomendasi,
          };
        }),
      );

      const avgSkor =
        allForStats.length > 0
          ? Math.round(allForStats.reduce((s, u) => s + u.kinerjaSkor, 0) / allForStats.length)
          : 0;

      const distribution = {
        top: allForStats.filter((u) => u.kinerjaLevel === 'top').length,
        bintang: allForStats.filter((u) => u.kinerjaLevel === 'bintang').length,
        aktif: allForStats.filter((u) => u.kinerjaLevel === 'aktif').length,
        baru: allForStats.filter((u) => u.kinerjaLevel === 'baru').length,
        nonaktif: allForStats.filter((u) => u.kinerjaLevel === 'nonaktif').length,
      };

      return {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: totalKoordinator,
          totalPages: Math.ceil(totalKoordinator / limit),
        },
        stats: {
          totalKoordinator,
          avgSkor,
          distribution,
        },
      };
    },
  );

  app.get(
    '/my-score',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const jwt = req.user as { sub: number; role: string };
      if (!isMobileFieldRole(jwt.role)) {
        return reply.code(403).send({ success: false, message: 'Hanya koordinator lapangan' });
      }

      const user = await prisma.user.findUnique({
        where: { id: jwt.sub },
        select: {
          id: true,
          nama: true,
          kinerjaSkor: true,
          kinerjaBintang: true,
          kinerjaLevel: true,
          totalWargaInput: true,
          totalLaporanInput: true,
          skorUpdatedAt: true,
        },
      });

      if (!user) return reply.code(404).send({ success: false, message: 'User tidak ditemukan' });

      const hasil = await hitungSkorKoordinator(user.id, prisma);

      return {
        success: true,
        data: {
          ...user,
          skor: hasil.skor,
          bintang: hasil.bintang,
          level: hasil.level,
          komponen: hasil.komponen,
          rekomendasi: hasil.rekomendasi,
        },
      };
    },
  );

  app.get(
    '/wilayah-summary',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const jwt = req.user as { role: string };
      if (!requireWilayahSummaryAccess(jwt.role)) {
        return reply.code(403).send({ success: false, message: 'Akses ditolak' });
      }

      const users = await prisma.user.findMany({
        where: { role: { in: [...KOORDINATOR_SCORING_ROLES] }, aktif: true, kecamatanId: { not: null } },
        select: {
          kinerjaSkor: true,
          kinerjaLevel: true,
          kecamatanId: true,
          kecamatan: { select: { nama: true } },
        },
      });

      const byKec = new Map<
        number,
        { kecamatan: string; scores: number[]; nonaktif: number; top: number }
      >();

      for (const u of users) {
        if (!u.kecamatanId || !u.kecamatan) continue;
        const cur = byKec.get(u.kecamatanId) ?? {
          kecamatan: u.kecamatan.nama,
          scores: [],
          nonaktif: 0,
          top: 0,
        };
        cur.scores.push(u.kinerjaSkor);
        if (u.kinerjaLevel === 'nonaktif') cur.nonaktif += 1;
        if (u.kinerjaLevel === 'top') cur.top += 1;
        byKec.set(u.kecamatanId, cur);
      }

      const summary = [...byKec.values()].map((row) => ({
        kecamatan: row.kecamatan,
        avgSkor:
          row.scores.length > 0
            ? Math.round(row.scores.reduce((a, b) => a + b, 0) / row.scores.length)
            : 0,
        totalKoordinator: row.scores.length,
        nonaktif: row.nonaktif,
        top: row.top,
      }));

      summary.sort((a, b) => b.avgSkor - a.avgSkor);

      return { success: true, data: summary };
    },
  );
}
