import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { territoryScopeMiddleware } from '../../middleware/territoryScope.middleware';
import { resolveVisibleRtIds } from '../security/security';

function authScope(app: FastifyInstance) {
  return [app.authenticate, territoryScopeMiddleware];
}

export async function wilayahRoutes(app: FastifyInstance) {
  app.get('/register/kecamatan/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.kecamatan.findUnique({
      where: { id: +id },
      select: { id: true, nama: true },
    });
    if (!row) return reply.code(404).send({ error: 'Kecamatan tidak ditemukan' });
    return row;
  });

  app.get('/register/kelurahan', async (req, reply) => {
    const { kecamatanId } = req.query as { kecamatanId?: string };
    if (!kecamatanId) return reply.code(400).send({ error: 'kecamatanId wajib' });
    return prisma.kelurahan.findMany({
      where: { kecamatanId: +kecamatanId },
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' },
    });
  });

  app.get('/register/rw', async (req, reply) => {
    const { kelurahanId } = req.query as { kelurahanId?: string };
    if (!kelurahanId) return reply.code(400).send({ error: 'kelurahanId wajib' });
    return prisma.rW.findMany({
      where: { kelurahanId: +kelurahanId },
      select: { id: true, nomor: true },
      orderBy: { nomor: 'asc' },
    });
  });

  app.get('/register/rt', async (req, reply) => {
    const { rwId } = req.query as { rwId?: string };
    if (!rwId) return reply.code(400).send({ error: 'rwId wajib' });
    return prisma.rT.findMany({
      where: { rwId: +rwId },
      select: { id: true, nomor: true },
      orderBy: { nomor: 'asc' },
    });
  });

  app.get('/kota', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const rtIds = await resolveVisibleRtIds(user);
    if (rtIds && rtIds.length === 0) return [];
    if (rtIds && rtIds.length > 0) {
      const kotaIds = await prisma.rT
        .findMany({
          where: { id: { in: rtIds } },
          select: { rw: { select: { kelurahan: { select: { kecamatan: { select: { kotaId: true } } } } } } },
        })
        .then((rows) => [...new Set(rows.map((r) => r.rw.kelurahan.kecamatan.kotaId))]);
      return prisma.kota.findMany({ where: { id: { in: kotaIds } }, include: { provinsi: true } });
    }
    return prisma.kota.findMany({ include: { provinsi: true } });
  });

  app.get('/kecamatan', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const { kotaId } = req.query as any;
    const rtIds = await resolveVisibleRtIds(user);
    if (rtIds && rtIds.length === 0) return [];
    if (rtIds && rtIds.length > 0) {
      const kecIds = await prisma.rT
        .findMany({
          where: { id: { in: rtIds } },
          select: { rw: { select: { kelurahan: { select: { kecamatanId: true } } } } },
        })
        .then((rows) => [...new Set(rows.map((r) => r.rw.kelurahan.kecamatanId))]);
      return prisma.kecamatan.findMany({
        where: { id: { in: kecIds }, ...(kotaId ? { kotaId: +kotaId } : {}) },
        include: { kota: true },
      });
    }
    return prisma.kecamatan.findMany({ where: kotaId ? { kotaId: +kotaId } : {}, include: { kota: true } });
  });

  app.get('/kelurahan', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const { kecamatanId } = req.query as any;
    const rtIds = await resolveVisibleRtIds(user);
    if (rtIds && rtIds.length === 0) return [];
    if (rtIds && rtIds.length > 0) {
      const kelIds = await prisma.rT
        .findMany({
          where: { id: { in: rtIds } },
          select: { rw: { select: { kelurahanId: true } } },
        })
        .then((rows) => [...new Set(rows.map((r) => r.rw.kelurahanId))]);
      return prisma.kelurahan.findMany({
        where: { id: { in: kelIds }, ...(kecamatanId ? { kecamatanId: +kecamatanId } : {}) },
        include: { kecamatan: true },
      });
    }
    return prisma.kelurahan.findMany({
      where: kecamatanId ? { kecamatanId: +kecamatanId } : {},
      include: { kecamatan: true },
    });
  });

  app.get('/rw', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const { kelurahanId } = req.query as any;
    const rtIds = await resolveVisibleRtIds(user);
    if (rtIds && rtIds.length === 0) return [];
    if (rtIds && rtIds.length > 0) {
      const rwIds = await prisma.rT.findMany({ where: { id: { in: rtIds } }, select: { rwId: true } }).then((rows) => [...new Set(rows.map((r) => r.rwId))]);
      return prisma.rW.findMany({
        where: { id: { in: rwIds }, ...(kelurahanId ? { kelurahanId: +kelurahanId } : {}) },
        include: { kelurahan: true, _count: { select: { rt: true } } },
      });
    }
    return prisma.rW.findMany({
      where: kelurahanId ? { kelurahanId: +kelurahanId } : {},
      include: { kelurahan: true, _count: { select: { rt: true } } },
    });
  });

  app.get('/rt', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const { rwId } = req.query as any;
    const rtIds = await resolveVisibleRtIds(user);
    const base: any = rwId ? { rwId: +rwId } : {};
    if (rtIds && rtIds.length === 0) return [];
    if (rtIds && rtIds.length > 0) {
      return prisma.rT.findMany({
        where: { id: { in: rtIds }, ...base },
        include: { rw: { include: { kelurahan: true } }, _count: { select: { warga: true } } },
      });
    }
    return prisma.rT.findMany({
      where: base,
      include: { rw: { include: { kelurahan: true } }, _count: { select: { warga: true } } },
    });
  });

  app.get('/rt-readiness', { preHandler: authScope(app) }, async (req) => {
    const user = req.user as any;
    const rtIds = await resolveVisibleRtIds(user);
    const where: any = rtIds && rtIds.length > 0 ? { id: { in: rtIds } } : rtIds && rtIds.length === 0 ? { id: -1 } : {};
    const rts = await prisma.rT.findMany({
      where,
      include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: { include: { kecamatan: true } } } } },
      orderBy: { id: 'asc' },
    });
    return rts.map((r) => ({
      id: r.id,
      nomor: r.nomor,
      rw: r.rw.nomor,
      kelurahan: r.rw.kelurahan.nama,
      kecamatan: r.rw.kelurahan.kecamatan.nama,
      jumlahWarga: r._count.warga,
      targetMinimal: 10,
      persen: Math.min(100, Math.round((r._count.warga / 10) * 100)),
      sudahLengkap: r._count.warga >= 10,
    }));
  });
}
