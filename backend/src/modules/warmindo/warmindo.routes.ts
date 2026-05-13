import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { getWarmindoScopeWhere } from '../security/security';

export async function warmindoRoutes(app: FastifyInstance) {
  async function assertWarmindoAccess(user: any, id: number) {
    const scope = getWarmindoScopeWhere(user);
    if (Object.keys(scope).length === 0) return true;
    return (await prisma.warmindoOutlet.count({ where: { ...scope, id } })) > 0;
  }

  app.get('/', { preHandler: [app.authenticate] }, async (req: any) =>
    prisma.warmindoOutlet.findMany({
      where: getWarmindoScopeWhere(req.user),
      include: { inventory: true, _count: { select: { transaksi: true } } },
    })
  );

  app.get('/:id', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    if (!(await assertWarmindoAccess(req.user, id))) return reply.code(404).send({ error: 'Warmindo tidak ditemukan atau di luar wilayah Anda' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [outlet, trxToday, pengeluaranToday] = await Promise.all([
      prisma.warmindoOutlet.findUnique({ where: { id }, include: { inventory: true } }),
      prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: id, tanggal: { gte: today } },
        _sum: { totalOmzet: true, grossProfit: true },
      }),
      prisma.warmindoPengeluaran.aggregate({
        where: { warmindoId: id, tanggal: { gte: today } },
        _sum: { jumlah: true },
      }),
    ]);

    const labaKotor = trxToday._sum.grossProfit || 0;
    const pengeluaran = pengeluaranToday._sum.jumlah || 0;

    return {
      ...outlet,
      hariIni: {
        omzet: trxToday._sum.totalOmzet || 0,
        labaKotor,
        pengeluaran,
        labaBersih: labaKotor - pengeluaran,
      },
    };
  });

  app.post('/', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const b = req.body;
    const count = await prisma.warmindoOutlet.count();
    const kode = `WRM-${String(count + 1).padStart(3, '0')}`;
    const outlet = await prisma.warmindoOutlet.create({
      data: {
        kodeOutlet: kode,
        namaOutlet: b.namaOutlet,
        kelurahanId: b.kelurahanId,
        alamat: b.alamat,
        modalAwal: Number(b.modalAwal) || 0,
        targetOmzetHarian: Number(b.targetOmzetHarian) || 0,
        biayaSewaBulanan: Number(b.biayaSewaBulanan) || 0,
      },
    });
    return reply.code(201).send(outlet);
  });

  app.post('/:id/transaksi', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    if (!(await assertWarmindoAccess(req.user, id))) return reply.code(404).send({ error: 'Warmindo tidak ditemukan atau di luar wilayah Anda' });
    const b = req.body;
    const omzet = Number(b.totalOmzet) || 0;
    const hpp = Number(b.totalHpp) || 0;
    const trx = await prisma.warmindoTransaksi.create({
      data: {
        warmindoId: id,
        totalOmzet: omzet,
        totalHpp: hpp,
        grossProfit: omzet - hpp,
        jumlahItem: Number(b.jumlahItem) || 1,
        items: b.items || [],
        catatan: b.catatan,
      },
    });
    return reply.code(201).send(trx);
  });

  app.post('/:id/pengeluaran', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    if (!(await assertWarmindoAccess(req.user, id))) return reply.code(404).send({ error: 'Warmindo tidak ditemukan atau di luar wilayah Anda' });
    const b = req.body;
    const p = await prisma.warmindoPengeluaran.create({
      data: {
        warmindoId: id,
        kategori: b.kategori,
        deskripsi: b.deskripsi,
        jumlah: Number(b.jumlah),
      },
    });
    return reply.code(201).send(p);
  });

  app.post('/:id/inventory', { preHandler: [app.authenticate] }, async (req: any, reply: any) => {
    const id = Number(req.params.id);
    if (!(await assertWarmindoAccess(req.user, id))) return reply.code(404).send({ error: 'Warmindo tidak ditemukan atau di luar wilayah Anda' });
    const b = req.body;
    const inv = await prisma.warmindoInventory.create({
      data: {
        warmindoId: id,
        namaBahan: b.namaBahan,
        satuan: b.satuan || 'pcs',
        stokSaatIni: Number(b.stokSaatIni) || 0,
        stokMinimum: Number(b.stokMinimum) || 0,
        hargaBeli: Number(b.hargaBeli) || 0,
        hargaJual: Number(b.hargaJual) || 0,
      },
    });
    return reply.code(201).send(inv);
  });

  app.put('/:id/inventory/:invId', { preHandler: [app.authenticate] }, async (req: any) => {
    const id = Number(req.params.id);
    if (!(await assertWarmindoAccess(req.user, id))) return { error: 'Warmindo tidak ditemukan atau di luar wilayah Anda' };
    const invId = Number(req.params.invId);
    const b = req.body;
    return prisma.warmindoInventory.update({
      where: { id: invId },
      data: { stokSaatIni: Number(b.stokSaatIni) },
    });
  });

  app.get('/:id/keuangan', { preHandler: [app.authenticate] }, async (req: any) => {
    const id = Number(req.params.id);
    if (!(await assertWarmindoAccess(req.user, id))) return { error: 'Warmindo tidak ditemukan atau di luar wilayah Anda' };
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [omzet, pengeluaran, count] = await Promise.all([
      prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: id, tanggal: { gte: startMonth } },
        _sum: { totalOmzet: true, grossProfit: true },
      }),
      prisma.warmindoPengeluaran.aggregate({
        where: { warmindoId: id, tanggal: { gte: startMonth } },
        _sum: { jumlah: true },
      }),
      prisma.warmindoTransaksi.count({ where: { warmindoId: id, tanggal: { gte: startMonth } } }),
    ]);

    const labaKotor = omzet._sum.grossProfit || 0;
    const totalPengeluaran = pengeluaran._sum.jumlah || 0;

    return {
      bulan: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      omzet: omzet._sum.totalOmzet || 0,
      labaKotor,
      pengeluaran: totalPengeluaran,
      labaBersih: labaKotor - totalPengeluaran,
      jumlahTransaksi: count,
    };
  });
}
