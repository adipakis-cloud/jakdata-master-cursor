import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function wargaRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (req: any) => {
    const user = req.user;
    const { rtId, page = 1, limit = 50, q } = req.query;
    const where: any = {};

    if (user.role === 'admin_pusat') {
      if (rtId) where.rtId = Number(rtId);
    } else if (user.rtId) {
      where.rtId = user.rtId;
    }

    if (q) where.nama = { contains: q, mode: 'insensitive' };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [data, total] = await Promise.all([
      prisma.warga.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { rt: { include: { rw: { include: { kelurahan: true } } } } },
      }),
      prisma.warga.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  });

  app.post('/', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const user = req.user;
    const b = req.body;

    if (!b.nama || !b.rtId) {
      return reply.code(400).send({ error: 'Nama dan RT wajib diisi' });
    }

    if (user.role === 'petugas_lapangan' && user.rtId && user.rtId !== Number(b.rtId)) {
      return reply.code(403).send({ error: 'Hanya bisa menambah warga di RT Anda' });
    }

    const warga = await prisma.warga.create({
      data: {
        rtId: Number(b.rtId),
        nama: b.nama,
        noHp: b.noHp,
        jenisKelamin: b.jenisKelamin,
        alamat: b.alamat,
        pekerjaan: b.pekerjaan,
        kategori: b.kategori || 'warga_biasa',
        statusEkonomi: b.statusEkonomi || null,
        catatan: b.catatan,
        createdBy: user.sub,
      },
    });

    return reply.code(201).send(warga);
  });

  app.get('/:id', { preHandler: [app.authenticate] }, async (req: any) => {
    const id = Number(req.params.id);
    return prisma.warga.findUnique({
      where: { id },
      include: {
        rt: { include: { rw: { include: { kelurahan: { include: { kecamatan: true } } } } } },
        keluarga: true,
      },
    });
  });

  app.put('/:id', { preHandler: [app.authenticate] }, async (req: any) => {
    const id = Number(req.params.id);
    const b = req.body;
    return prisma.warga.update({
      where: { id },
      data: {
        nama: b.nama,
        noHp: b.noHp,
        kategori: b.kategori,
        statusEkonomi: b.statusEkonomi || null,
        catatan: b.catatan,
      },
    });
  });

  app.get('/keluarga/list', { preHandler: [app.authenticate] }, async (req: any) => {
    const user = req.user;
    const where: any = user.rtId ? { rtId: user.rtId } : {};
    return prisma.keluarga.findMany({
      where,
      include: { rt: true, _count: { select: { warga: true } } },
      take: 100,
    });
  });

  app.post('/keluarga', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const b = req.body;
    const kk = await prisma.keluarga.create({
      data: {
        rtId: Number(b.rtId),
        namaKepala: b.namaKepala,
        noHpKepala: b.noHpKepala,
        jumlahAnggota: Number(b.jumlahAnggota) || 1,
        jumlahTanggungan: Number(b.jumlahTanggungan) || 0,
        statusEkonomi: b.statusEkonomi || null,
        totalPenghasilan: Number(b.totalPenghasilan) || 0,
      },
    });
    return reply.code(201).send(kk);
  });
}
