import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function koordinatorRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const rows = await prisma.wilayahAssignment.findMany({
      where: { status: 'aktif' },
      include: {
        user: { select: { id: true, nama: true, role: true, noHp: true, email: true } },
        kecamatan: { select: { nama: true } },
        kelurahan: { select: { nama: true, kecamatan: { select: { nama: true } } } },
        rw: { select: { nomor: true, kelurahan: { select: { nama: true } } } },
        rt: { select: { nomor: true, rw: { select: { nomor: true, kelurahan: { select: { nama: true } } } } } },
      },
      orderBy: [{ level: 'asc' }, { assignedAt: 'desc' }],
    });

    return rows.map((r) => ({
      id: r.id, level: r.level, status: r.status,
      kecamatanId: r.kecamatanId, kelurahanId: r.kelurahanId, rwId: r.rwId, rtId: r.rtId,
      assignedAt: r.assignedAt,
      wilayahNama:
        r.kecamatan?.nama ??
        (r.kelurahan ? `${r.kelurahan.nama}, ${r.kelurahan.kecamatan.nama}` : null) ??
        (r.rw ? `RW ${r.rw.nomor}, ${r.rw.kelurahan.nama}` : null) ??
        (r.rt ? `RT ${r.rt.nomor}/RW ${r.rt.rw.nomor}, ${r.rt.rw.kelurahan.nama}` : null) ??
        r.level,
      user: r.user,
    }));
  });

  app.get('/kosong', { preHandler: [app.authenticate] }, async (req) => {
    const { level = 'kecamatan' } = req.query as any;
    if (level === 'kecamatan') {
      const assigned = await prisma.wilayahAssignment.findMany({ where: { level: 'kecamatan', status: 'aktif', kecamatanId: { not: null } }, select: { kecamatanId: true } });
      const ids = assigned.map(a => a.kecamatanId).filter((id): id is number => typeof id === 'number');
      if (ids.length === 0) {
        return prisma.kecamatan.findMany({ include: { kota: { select: { nama: true } } }, take: 50, orderBy: { nama: 'asc' } })
          .then(list => list.map(k => ({ id: k.id, nama: k.nama, kota: k.kota.nama })));
      }
      return prisma.kecamatan.findMany({ where: { id: { notIn: ids } }, include: { kota: { select: { nama: true } } }, take: 50, orderBy: { nama: 'asc' } })
        .then(list => list.map(k => ({ id: k.id, nama: k.nama, kota: k.kota.nama })));
    }
    if (level === 'kelurahan') {
      const assigned = await prisma.wilayahAssignment.findMany({ where: { level: 'kelurahan', status: 'aktif', kelurahanId: { not: null } }, select: { kelurahanId: true } });
      const ids = assigned.map(a => a.kelurahanId).filter((id): id is number => typeof id === 'number');
      if (ids.length === 0) {
        return prisma.kelurahan.findMany({ include: { kecamatan: { include: { kota: { select: { nama: true } } } } }, take: 50, orderBy: { nama: 'asc' } })
          .then(list => list.map(k => ({ id: k.id, nama: k.nama, kecamatan: k.kecamatan.nama, kota: k.kecamatan.kota.nama })));
      }
      return prisma.kelurahan.findMany({ where: { id: { notIn: ids } }, include: { kecamatan: { include: { kota: { select: { nama: true } } } } }, take: 50, orderBy: { nama: 'asc' } })
        .then(list => list.map(k => ({ id: k.id, nama: k.nama, kecamatan: k.kecamatan.nama, kota: k.kecamatan.kota.nama })));
    }
    if (level === 'rw') {
      const assigned = await prisma.wilayahAssignment.findMany({ where: { level: 'rw', status: 'aktif', rwId: { not: null } }, select: { rwId: true } });
      const ids = assigned.map(a => a.rwId).filter((id): id is number => typeof id === 'number');
      return prisma.rW.findMany({
        where: ids.length ? { id: { notIn: ids } } : {},
        include: { kelurahan: { include: { kecamatan: true } } },
        take: 50,
        orderBy: { id: 'asc' },
      }).then(list => list.map(r => ({ id: r.id, nama: `RW ${r.nomor}`, kelurahan: r.kelurahan.nama, kecamatan: r.kelurahan.kecamatan.nama })));
    }
    if (level === 'rt') {
      const assigned = await prisma.wilayahAssignment.findMany({ where: { level: 'rt', status: 'aktif', rtId: { not: null } }, select: { rtId: true } });
      const ids = assigned.map(a => a.rtId).filter((id): id is number => typeof id === 'number');
      return prisma.rT.findMany({
        where: ids.length ? { id: { notIn: ids } } : {},
        include: { rw: { include: { kelurahan: { include: { kecamatan: true } } } } },
        take: 50,
        orderBy: { id: 'asc' },
      }).then(list => list.map(r => ({ id: r.id, nama: `RT ${r.nomor}`, rw: r.rw.nomor, kelurahan: r.rw.kelurahan.nama, kecamatan: r.rw.kelurahan.kecamatan.nama })));
    }
    return [];
  });
}