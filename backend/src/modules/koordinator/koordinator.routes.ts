import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function koordinatorRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const rows = await prisma.$queryRaw`
      SELECT wa.id, wa.level, wa.status, wa.kecamatan_id, wa.kelurahan_id, wa.rw_id, wa.rt_id, wa.assigned_at,
             u.id as user_id, u.nama, u.role, u.no_hp, u.email
      FROM wilayah_assignments wa
      JOIN users u ON u.id = wa.user_id
      WHERE wa.status = 'aktif'
      ORDER BY wa.level, wa.assigned_at DESC
    ` as any[];

    return rows.map((r: any) => ({
      id: r.id, level: r.level, status: r.status,
      kecamatanId: r.kecamatan_id, kelurahanId: r.kelurahan_id, rwId: r.rw_id, rtId: r.rt_id,
      assignedAt: r.assigned_at,
      wilayahNama: r.level,
      user: { id: r.user_id, nama: r.nama, role: r.role, noHp: r.no_hp, email: r.email }
    }));
  });

  app.get('/kosong', { preHandler: [app.authenticate] }, async (req) => {
    const { level = 'kecamatan' } = req.query as any;
    if (level === 'kecamatan') {
      const assigned = await prisma.$queryRaw`SELECT kecamatan_id FROM wilayah_assignments WHERE level='kecamatan' AND status='aktif'` as any[];
      const ids = assigned.map((a: any) => a.kecamatan_id).filter(Boolean);
      if (ids.length === 0) {
        return prisma.kecamatan.findMany({ include: { kota: { select: { nama: true } } }, take: 50, orderBy: { nama: 'asc' } })
          .then(list => list.map(k => ({ id: k.id, nama: k.nama, kota: k.kota.nama })));
      }
      return prisma.kecamatan.findMany({ where: { id: { notIn: ids } }, include: { kota: { select: { nama: true } } }, take: 50, orderBy: { nama: 'asc' } })
        .then(list => list.map(k => ({ id: k.id, nama: k.nama, kota: k.kota.nama })));
    }
    if (level === 'kelurahan') {
      const assigned = await prisma.$queryRaw`SELECT kelurahan_id FROM wilayah_assignments WHERE level='kelurahan' AND status='aktif'` as any[];
      const ids = assigned.map((a: any) => a.kelurahan_id).filter(Boolean);
      if (ids.length === 0) {
        return prisma.kelurahan.findMany({ include: { kecamatan: { include: { kota: { select: { nama: true } } } } }, take: 50, orderBy: { nama: 'asc' } })
          .then(list => list.map(k => ({ id: k.id, nama: k.nama, kecamatan: k.kecamatan.nama, kota: k.kecamatan.kota.nama })));
      }
      return prisma.kelurahan.findMany({ where: { id: { notIn: ids } }, include: { kecamatan: { include: { kota: { select: { nama: true } } } } }, take: 50, orderBy: { nama: 'asc' } })
        .then(list => list.map(k => ({ id: k.id, nama: k.nama, kecamatan: k.kecamatan.nama, kota: k.kecamatan.kota.nama })));
    }
    return [];
  });
}