import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { getRtScopeWhere } from '../security/security';

export async function wilayahRoutes(app: FastifyInstance) {
  app.get('/kota', async () => prisma.kota.findMany({ include: { provinsi: true } }));

  app.get('/kecamatan', async (req) => {
    const { kotaId } = req.query as any;
    return prisma.kecamatan.findMany({ where: kotaId ? { kotaId: +kotaId } : {}, include: { kota: true } });
  });

  app.get('/kelurahan', async (req) => {
    const { kecamatanId } = req.query as any;
    return prisma.kelurahan.findMany({ where: kecamatanId ? { kecamatanId: +kecamatanId } : {}, include: { kecamatan: true } });
  });

  app.get('/rw', async (req) => {
    const { kelurahanId } = req.query as any;
    return prisma.rW.findMany({ where: kelurahanId ? { kelurahanId: +kelurahanId } : {}, include: { kelurahan: true, _count: { select: { rt: true } } } });
  });

  app.get('/rt', async (req) => {
    const { rwId } = req.query as any;
    return prisma.rT.findMany({
      where: rwId ? { rwId: +rwId } : {},
      include: { rw: { include: { kelurahan: true } }, _count: { select: { warga: true } } },
    });
  });

  app.get('/rt-readiness', { preHandler: [app.authenticate] }, async (req) => {
    const user = req.user as any;
    const rts = await prisma.rT.findMany({
      where: getRtScopeWhere(user),
      include: { _count: { select: { warga: true } }, rw: { include: { kelurahan: { include: { kecamatan: true } } } } },
      orderBy: { id: 'asc' },
    });
    return rts.map(r => ({
      id: r.id, nomor: r.nomor, rw: r.rw.nomor,
      kelurahan: r.rw.kelurahan.nama, kecamatan: r.rw.kelurahan.kecamatan.nama,
      jumlahWarga: r._count.warga, targetMinimal: r.targetWarga,
      persen: Math.min(100, Math.round((r._count.warga / r.targetWarga) * 100)),
      sudahLengkap: r._count.warga >= r.targetWarga,
    }));
  });
}
