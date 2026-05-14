import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function bantuanRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async () =>
    prisma.bantuan.findMany({ include: { _count: { select: { penerima: true } } } })
  );

  app.get('/fairness', { preHandler: [app.authenticate] }, async () => {
    const [latestSnapshot, anomalies, repeatedRecipients, highRiskFamilies, reachedFamilyIds] = await Promise.all([
      (prisma as any).bantuanFairnessSnapshot.findFirst({ orderBy: { calculatedAt: 'desc' } }),
      (prisma as any).bantuanAnomaly.findMany({ where: { status: 'open' }, orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }], take: 20 }),
      prisma.bantuanPenerima.groupBy({ by: ['keluargaId'], where: { keluargaId: { not: null }, status: 'diterima' }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 40 }),
      prisma.keluarga.findMany({ where: { skorPrioritasBantuan: { gte: 80 } }, select: { id: true, namaKepala: true, noKk: true, skorPrioritasBantuan: true, rtId: true } }),
      prisma.bantuanPenerima.findMany({ where: { keluargaId: { not: null }, status: 'diterima' }, select: { keluargaId: true } }),
    ]);
    const reached = new Set(reachedFamilyIds.map(r => r.keluargaId).filter(Boolean));
    const uncoveredFamilies = highRiskFamilies.filter(f => !reached.has(f.id)).slice(0, 20);
    const repeated = repeatedRecipients.filter(r => r._count.id > 1).slice(0, 20);

    return {
      snapshot: latestSnapshot ?? {
        fairnessScore: 0,
        repeatedRecipients: repeated.length,
        uncoveredHighRisk: uncoveredFamilies.length,
      },
      repeatedRecipients: repeated,
      uncoveredFamilies,
      anomalies,
    };
  });

  app.post('/', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const b = req.body;
    const created = await prisma.bantuan.create({
      data: {
        nama: b.nama,
        tipe: b.tipe,
        deskripsi: b.deskripsi,
        satuan: b.satuan || 'paket',
        nilaiPerSatuan: Number(b.nilaiPerSatuan) || 0,
        stokTotal: Number(b.stokTotal) || 0,
        stokTersisa: Number(b.stokTotal) || 0,
        sumber: b.sumber,
      },
    });
    return reply.code(201).send(created);
  });

  app.get('/penerima', { preHandler: [app.authenticate] }, async (req: any) => {
    const bantuanId = req.query.bantuanId;
    return prisma.bantuanPenerima.findMany({
      where: bantuanId ? { bantuanId: Number(bantuanId) } : {},
      include: { bantuan: true, keluarga: true },
    });
  });

  app.post('/penerima', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const b = req.body;
    const p = await prisma.bantuanPenerima.create({
      data: {
        bantuanId: Number(b.bantuanId),
        namaPenerima: b.namaPenerima,
        rtId: b.rtId,
        jumlahDiterima: Number(b.jumlahDiterima),
        keluargaId: b.keluargaId,
      },
    });
    await prisma.bantuan.update({
      where: { id: Number(b.bantuanId) },
      data: { stokTersisa: { decrement: Number(b.jumlahDiterima) } },
    });
    return reply.code(201).send(p);
  });

  app.patch('/penerima/:id/status', { preHandler: [app.authenticate] }, async (req: any) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    return prisma.bantuanPenerima.update({
      where: { id },
      data: { status, tanggalDiterima: status === 'diterima' ? new Date() : undefined },
    });
  });
}
