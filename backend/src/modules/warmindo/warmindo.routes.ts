import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';

export async function warmindoRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (req: any) => {
    const where = await warmindoScope(req.user);
    const outlets = await prisma.warmindoOutlet.findMany({
      where,
      include: { inventory: true, _count: { select: { transaksi: true } } },
      orderBy: { kodeOutlet: 'asc' },
    });

    const today = startToday();
    return Promise.all(outlets.map(async (outlet) => {
      const [sales, expenses, lowStock, attendanceIssues] = await Promise.all([
        prisma.warmindoTransaksi.aggregate({ where: { warmindoId: outlet.id, tanggal: { gte: today } }, _sum: { totalOmzet: true, grossProfit: true } }),
        prisma.warmindoPengeluaran.aggregate({ where: { warmindoId: outlet.id, tanggal: { gte: today } }, _sum: { jumlah: true } }),
        (prisma as any).warmindoInventory.count({ where: { warmindoId: outlet.id } }).then(async () => outlet.inventory.filter((i: any) => i.stokSaatIni <= i.stokMinimum).length),
        (prisma as any).warmindoAttendance.count({ where: { warmindoId: outlet.id, tanggal: { gte: today }, status: { in: ['absent','late'] } } }),
      ]);
      const grossProfit = sales._sum.grossProfit ?? 0;
      const totalExpenses = expenses._sum.jumlah ?? 0;
      return {
        ...outlet,
        operationalSummary: {
          omzetHariIni: sales._sum.totalOmzet ?? 0,
          profitEstimate: grossProfit - totalExpenses,
          lowStock,
          attendanceIssues,
          problematic: lowStock > 0 || attendanceIssues > 0 || grossProfit - totalExpenses < 0,
        },
      };
    }));
  });

  app.get('/summary', { preHandler: [app.authenticate] }, async (req: any) => {
    const where = await warmindoScope(req.user);
    const outlets = await prisma.warmindoOutlet.findMany({ where, select: { id: true, namaOutlet: true, kodeOutlet: true, status: true } });
    const outletIds = outlets.map(o => o.id);
    const today = startToday();

    const [sales, expenses, topProductsRaw, inventory, attendanceIssues, maintenance] = await Promise.all([
      prisma.warmindoTransaksi.aggregate({ where: { warmindoId: { in: outletIds }, tanggal: { gte: today } }, _sum: { totalOmzet: true, grossProfit: true } }),
      prisma.warmindoPengeluaran.aggregate({ where: { warmindoId: { in: outletIds }, tanggal: { gte: today } }, _sum: { jumlah: true } }),
      (prisma as any).warmindoSaleLineItem.groupBy({ by: ['productName'], where: { warmindoId: { in: outletIds } }, _sum: { qty: true, total: true }, orderBy: { _sum: { qty: 'desc' } }, take: 5 }),
      prisma.warmindoInventory.findMany({ where: { warmindoId: { in: outletIds } }, include: { warmindo: true } }),
      (prisma as any).warmindoAttendance.findMany({ where: { warmindoId: { in: outletIds }, tanggal: { gte: today }, status: { in: ['absent','late'] } }, take: 10 }),
      (prisma as any).warmindoMaintenance.findMany({ where: { warmindoId: { in: outletIds }, status: 'open' }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    const lowStock = inventory.filter(i => i.stokSaatIni <= i.stokMinimum).map(i => ({ outlet: i.warmindo.namaOutlet, item: i.namaBahan, stok: i.stokSaatIni, minimum: i.stokMinimum, satuan: i.satuan }));
    const profitEstimate = (sales._sum.grossProfit ?? 0) - (expenses._sum.jumlah ?? 0);
    const problematicOutlet = outlets.find(o => maintenance.some((m: any) => m.warmindoId === o.id) || lowStock.some(i => i.outlet === o.namaOutlet));

    return {
      activeOutlets: outlets.filter(o => o.status === 'aktif').length,
      dailyOmzet: sales._sum.totalOmzet ?? 0,
      profitEstimate,
      topProducts: topProductsRaw.map((p: any) => ({ productName: p.productName, qty: p._sum.qty ?? 0, total: p._sum.total ?? 0 })),
      lowStock,
      problematicOutlet: problematicOutlet ? { id: problematicOutlet.id, namaOutlet: problematicOutlet.namaOutlet, kodeOutlet: problematicOutlet.kodeOutlet } : null,
      staffAttendanceIssues: attendanceIssues.length,
      maintenanceIssues: maintenance.length,
    };
  });

  app.get('/:id', { preHandler: [app.authenticate] }, async (req: any) => {
    const id = Number(req.params.id);
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
    const invId = Number(req.params.invId);
    const b = req.body;
    return prisma.warmindoInventory.update({
      where: { id: invId },
      data: { stokSaatIni: Number(b.stokSaatIni) },
    });
  });

  app.get('/:id/keuangan', { preHandler: [app.authenticate] }, async (req: any) => {
    const id = Number(req.params.id);
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

function startToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

async function warmindoScope(user: any) {
  if (!user || ['admin_pusat','auditor','finance_admin'].includes(user.role)) return {};
  if (['manager_warmindo','kasir_warmindo'].includes(user.role)) return user.warmindoId ? { id: user.warmindoId } : { id: -1 };
  if (user.rtId) return { rtId: user.rtId };
  if (user.kelurahanId) return { kelurahanId: user.kelurahanId };
  if (user.rwId) {
    const rts = await prisma.rT.findMany({ where: { rwId: user.rwId }, select: { id: true } });
    return { rtId: { in: rts.map(rt => rt.id) } };
  }
  if (user.kecamatanId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahan: { kecamatanId: user.kecamatanId } } }, select: { id: true } });
    return { rtId: { in: rts.map(rt => rt.id) } };
  }
  if (user.kotaId) {
    const rts = await prisma.rT.findMany({ where: { rw: { kelurahan: { kecamatan: { kotaId: user.kotaId } } } }, select: { id: true } });
    return { rtId: { in: rts.map(rt => rt.id) } };
  }
  return { id: -1 };
}
