import { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../../config/prisma';
import { getPagination } from '../../lib/pagination';
import { territoryScopeMiddleware } from '../../middleware/territoryScope.middleware';
import { resolveVisibleRtIds } from '../security/security';

function authScope(app: FastifyInstance) {
  return [app.authenticate, territoryScopeMiddleware];
}

function startToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function endToday() {
  const t = startToday();
  t.setHours(23, 59, 59, 999);
  return t;
}

function dayBounds(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return { start: s, end: e };
}

async function warmindoScope(user: any) {
  if (!user || ['admin_pusat', 'auditor', 'finance_admin'].includes(user.role)) return {};
  if (['manager_warmindo', 'kasir_warmindo'].includes(user.role)) {
    return user.warmindoId ? { id: user.warmindoId } : { id: -1 };
  }
  const rtIds = await resolveVisibleRtIds(user);
  if (rtIds === null) return {};
  if (rtIds.length === 0) return { id: -1 };
  const kelRows = await prisma.rT.findMany({
    where: { id: { in: rtIds } },
    select: { rw: { select: { kelurahanId: true } } },
  });
  const kelIds = [...new Set(kelRows.map((r) => r.rw.kelurahanId))];
  return { OR: [{ rtId: { in: rtIds } }, { kelurahanId: { in: kelIds } }] };
}

async function assertWarmindoOutletInScope(user: any, outletId: number, reply: FastifyReply) {
  const where = await warmindoScope(user);
  const outlet = await prisma.warmindoOutlet.findFirst({ where: { AND: [{ id: outletId }, where] } });
  if (!outlet) {
    reply.code(404).send({ error: 'Outlet tidak ditemukan atau di luar wilayah Anda.' });
    return false;
  }
  return true;
}

async function resolveOutletId(user: any, query: any, reply: FastifyReply): Promise<number | null> {
  const qId = query?.outletId != null && String(query.outletId).trim() !== '' ? Number(query.outletId) : NaN;
  if (['manager_warmindo', 'kasir_warmindo'].includes(user.role)) {
    const wid = user.warmindoId != null ? Number(user.warmindoId) : NaN;
    if (!Number.isFinite(wid) || wid <= 0) {
      reply.code(403).send({ error: 'Akun warmindo tidak memiliki outlet.' });
      return null;
    }
    const ok = await assertWarmindoOutletInScope(user, wid, reply);
    return ok ? wid : null;
  }
  if (Number.isFinite(qId) && qId > 0) {
    const ok = await assertWarmindoOutletInScope(user, qId, reply);
    return ok ? qId : null;
  }
  const where = await warmindoScope(user);
  const first = await prisma.warmindoOutlet.findFirst({ where, orderBy: { id: 'asc' }, select: { id: true } });
  if (!first) {
    reply.code(404).send({ error: 'Tidak ada outlet dalam cakupan Anda.' });
    return null;
  }
  return first.id;
}

/** Kasir/manager: outlet id must come from JWT `warmindoId` only (POS / mobile). */
async function requireWarmindoStaffOutletId(user: any, reply: FastifyReply): Promise<number | null> {
  if (!['manager_warmindo', 'kasir_warmindo'].includes(user?.role)) {
    reply.code(403).send({ error: 'Hanya akun outlet warmindo (kasir/manager).' });
    return null;
  }
  const wid = user.warmindoId != null ? Number(user.warmindoId) : NaN;
  if (!Number.isFinite(wid) || wid <= 0) {
    reply.code(403).send({ error: 'Tidak terhubung ke outlet.' });
    return null;
  }
  return wid;
}

function performanceStatus(target: number, omzet: number): 'tercapai' | 'hampir' | 'di_bawah_target' | 'no_target' {
  if (!target || target <= 0) return 'no_target';
  const pct = (omzet / target) * 100;
  if (pct >= 100) return 'tercapai';
  if (pct >= 75) return 'hampir';
  return 'di_bawah_target';
}

export function registerWarmindoOperationalRoutes(app: FastifyInstance) {
  app.get('/network-summary', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    if (user.role !== 'admin_pusat' && user.role !== 'admin_kota') {
      return reply.code(403).send({ error: 'Hanya admin pusat atau admin kota.' });
    }
    const where = await warmindoScope(user);
    const outlets = await prisma.warmindoOutlet.findMany({
      where,
      include: { kelurahan: { include: { kecamatan: true } } },
    });
    const today = startToday();
    const outletIds = outlets.map((o) => o.id);
    const salesToday = await prisma.warmindoTransaksi.aggregate({
      where: { warmindoId: { in: outletIds }, tanggal: { gte: today } },
      _sum: { totalOmzet: true },
    });
    const lowStockRows = await prisma.warmindoInventory.findMany({
      where: { warmindoId: { in: outletIds } },
      select: { warmindoId: true, stokSaatIni: true, stokMinimum: true },
    });
    const lowByOutlet = new Set<number>();
    for (const r of lowStockRows) {
      if (r.stokSaatIni <= r.stokMinimum) lowByOutlet.add(r.warmindoId);
    }

    let belowTarget = 0;
    for (const o of outlets) {
      const agg = await prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: o.id, tanggal: { gte: today } },
        _sum: { totalOmzet: true },
      });
      const omz = agg._sum.totalOmzet ?? 0;
      if (o.targetOmzetHarian > 0 && omz < o.targetOmzetHarian * 0.75) belowTarget++;
    }

    const byKecMap = new Map<string, { outlets: number; totalOmzet: number; sumPct: number; n: number }>();
    for (const o of outlets) {
      const kecNama = o.kelurahan?.kecamatan?.nama ?? '—';
      const agg = await prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: o.id, tanggal: { gte: today } },
        _sum: { totalOmzet: true },
      });
      const omz = agg._sum.totalOmzet ?? 0;
      const pct = o.targetOmzetHarian > 0 ? (omz / o.targetOmzetHarian) * 100 : 0;
      const cur = byKecMap.get(kecNama) ?? { outlets: 0, totalOmzet: 0, sumPct: 0, n: 0 };
      cur.outlets += 1;
      cur.totalOmzet += omz;
      cur.sumPct += pct;
      cur.n += 1;
      byKecMap.set(kecNama, cur);
    }

    const byKecamatan = [...byKecMap.entries()].map(([kecamatanNama, v]) => ({
      kecamatanNama,
      outlets: v.outlets,
      totalOmzet: v.totalOmzet,
      avgAchievement: v.n ? v.sumPct / v.n : 0,
    }));

    let needAttention = 0;
    for (const o of outlets) {
      const low = lowByOutlet.has(o.id);
      const agg = await prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: o.id, tanggal: { gte: today } },
        _sum: { totalOmzet: true },
      });
      const omz = agg._sum.totalOmzet ?? 0;
      const below = o.targetOmzetHarian > 0 && omz < o.targetOmzetHarian * 0.75;
      if (low || below) needAttention++;
    }

    return {
      totalOutlets: outlets.length,
      activeOutlets: outlets.filter((o) => o.status === 'aktif').length,
      totalOmzetHariIni: salesToday._sum.totalOmzet ?? 0,
      outletBelowTarget: belowTarget,
      outletLowStock: lowByOutlet.size,
      outletNeedAttention: needAttention,
      byKecamatan,
    };
  });

  app.get('/dashboard', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const outletId = await resolveOutletId(req.user, req.query, reply);
    if (outletId == null) return;
    const outlet = await prisma.warmindoOutlet.findUnique({
      where: { id: outletId },
      include: { kelurahan: { include: { kecamatan: true } } },
    });
    if (!outlet) return reply.code(404).send({ error: 'Outlet tidak ditemukan.' });

    const today = startToday();
    const end = endToday();
    const [trxAgg, pengAgg, invAll, shiftCount] = await Promise.all([
      prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: outletId, tanggal: { gte: today, lte: end } },
        _sum: { totalOmzet: true, totalHpp: true, grossProfit: true },
        _count: { id: true },
      }),
      prisma.warmindoPengeluaran.aggregate({
        where: { warmindoId: outletId, tanggal: { gte: today, lte: end } },
        _sum: { jumlah: true },
      }),
      prisma.warmindoInventory.findMany({ where: { warmindoId: outletId } }),
      prisma.warmindoShift.count({
        where: { warmindoId: outletId, tanggal: today },
      }),
    ]);

    const omzet = trxAgg._sum.totalOmzet ?? 0;
    const hpp = trxAgg._sum.totalHpp ?? 0;
    const grossProfit = trxAgg._sum.grossProfit ?? 0;
    const pengeluaran = pengAgg._sum.jumlah ?? 0;
    const netProfit = grossProfit - pengeluaran;
    const target = outlet.targetOmzetHarian ?? 0;
    const targetAchievementPct = target > 0 ? (omzet / target) * 100 : 0;
    const lowStockItems = invAll
      .filter((i) => i.stokSaatIni <= i.stokMinimum)
      .map((i) => ({
        namaBahan: i.namaBahan,
        stokSaatIni: i.stokSaatIni,
        stokMinimum: i.stokMinimum,
        satuan: i.satuan,
      }));

    const weeklyTrend: { tanggal: string; omzet: number; grossProfit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const { start, end: ed } = dayBounds(d);
      const a = await prisma.warmindoTransaksi.aggregate({
        where: { warmindoId: outletId, tanggal: { gte: start, lte: ed } },
        _sum: { totalOmzet: true, grossProfit: true },
      });
      weeklyTrend.push({
        tanggal: start.toISOString().slice(0, 10),
        omzet: a._sum.totalOmzet ?? 0,
        grossProfit: a._sum.grossProfit ?? 0,
      });
    }

    return {
      outlet: {
        id: outlet.id,
        namaOutlet: outlet.namaOutlet,
        status: outlet.status,
        kelurahan: outlet.kelurahan?.nama ?? null,
        kecamatan: outlet.kelurahan?.kecamatan?.nama ?? null,
      },
      today: {
        omzet,
        hpp,
        grossProfit,
        pengeluaran,
        netProfit,
        jumlahTransaksi: trxAgg._count.id,
        targetOmzet: target,
        targetAchievementPct,
        performanceStatus: performanceStatus(target, omzet),
      },
      inventory: {
        totalItems: invAll.length,
        lowStockItems,
        lowStockAlert: lowStockItems.length > 0,
      },
      employees: {
        total: outlet.karyawanTotal,
        activeShifts: shiftCount,
      },
      weeklyTrend,
    };
  });

  app.post('/transaksi', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    const warmindoId = await requireWarmindoStaffOutletId(user, reply);
    if (warmindoId == null) return;

    const b = req.body ?? {};
    const items = Array.isArray(b.items) ? b.items : [];
    const metodeBayar = String(b.metodeBayar ?? 'tunai');
    const catatan = b.catatan != null && String(b.catatan).trim() !== '' ? String(b.catatan) : null;

    const totalOmzet = items.reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);
    const totalHpp = items.reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.unitHpp || 0), 0);
    const grossProfit = totalOmzet - totalHpp;
    const jumlahItemQty = items.reduce((s: number, i: any) => s + Number(i.qty || 0), 0);

    const trx = await prisma.$transaction(async (tx) => {
      const row = await tx.warmindoTransaksi.create({
        data: {
          warmindoId,
          totalOmzet,
          totalHpp,
          grossProfit,
          jumlahItem: Math.round(jumlahItemQty),
          metodeBayar,
          items: items as any,
          catatan,
        },
      });
      if (items.length) {
        await tx.warmindoSaleLineItem.createMany({
          data: items.map((i: any) => {
            const qty = Number(i.qty) || 0;
            const up = Number(i.unitPrice) || 0;
            const uh = Number(i.unitHpp) || 0;
            return {
              transaksiId: row.id,
              warmindoId,
              productName: String(i.productName ?? 'Item'),
              qty,
              unitPrice: up,
              unitHpp: uh,
              total: qty * up,
              grossProfit: qty * (up - uh),
            };
          }),
        });
      }
      await tx.warmindoCashflowLedger.create({
        data: {
          warmindoId,
          direction: 'in',
          kategori: 'penjualan',
          amount: totalOmzet,
          description: `Penjualan ${items.length} item`,
          referenceType: 'transaksi',
          referenceId: row.id,
        },
      });
      return row;
    });

    const outlet = await prisma.warmindoOutlet.findUnique({ where: { id: warmindoId }, select: { namaOutlet: true } });
    return reply.code(201).send({
      transaksi: trx,
      namaOutlet: outlet?.namaOutlet ?? null,
      summary: {
        totalOmzet,
        totalHpp,
        grossProfit,
        jumlahItem: trx.jumlahItem,
      },
    });
  });

  app.get('/transaksi', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const warmindoId = await requireWarmindoStaffOutletId(req.user, reply);
    if (warmindoId == null) return;

    const { page, limit, skip } = getPagination(req.query);
    const dateStr = req.query?.date as string | undefined;
    const where: any = { warmindoId };
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(`${dateStr}T00:00:00`);
      const { start, end } = dayBounds(d);
      where.tanggal = { gte: start, lte: end };
    } else {
      const startR = startToday();
      startR.setDate(startR.getDate() - 6);
      where.tanggal = { gte: startR, lte: endToday() };
    }

    const [data, total] = await Promise.all([
      prisma.warmindoTransaksi.findMany({
        where,
        orderBy: { tanggal: 'desc' },
        skip,
        take: limit,
      }),
      prisma.warmindoTransaksi.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    reply.header('x-total-count', String(total));
    reply.header('x-page', String(page));
    reply.header('x-limit', String(limit));
    reply.header('x-total-pages', String(totalPages));
    return { data, total, page, limit, totalPages };
  });

  app.get('/transaksi/summary', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const outletId = await resolveOutletId(req.user, {}, reply);
    if (outletId == null) return;
    const period = String(req.query?.period ?? 'today');
    const now = new Date();
    let start = startToday();
    if (period === 'week') {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const agg = await prisma.warmindoTransaksi.aggregate({
      where: { warmindoId: outletId, tanggal: { gte: start } },
      _sum: { totalOmzet: true, totalHpp: true, grossProfit: true },
      _count: { id: true },
    });
    return {
      totalOmzet: agg._sum.totalOmzet ?? 0,
      totalHpp: agg._sum.totalHpp ?? 0,
      grossProfit: agg._sum.grossProfit ?? 0,
      jumlahTransaksi: agg._count.id,
      period,
    };
  });

  app.get('/inventory', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const warmindoId = await requireWarmindoStaffOutletId(req.user, reply);
    if (warmindoId == null) return;
    const rows = await prisma.warmindoInventory.findMany({ where: { warmindoId } });
    const mapped = rows
      .map((r) => ({
        ...r,
        lowStock: r.stokSaatIni <= r.stokMinimum && r.stokMinimum > 0,
      }))
      .sort((a, b) => {
        if (a.lowStock !== b.lowStock) return a.lowStock ? -1 : 1;
        return a.namaBahan.localeCompare(b.namaBahan, 'id');
      });
    return mapped;
  });

  app.patch('/inventory/:id', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const outletId = await resolveOutletId(req.user, {}, reply);
    if (outletId == null) return;
    const invId = Number(req.params.id);
    const inv = await prisma.warmindoInventory.findFirst({ where: { id: invId, warmindoId: outletId } });
    if (!inv) return reply.code(404).send({ error: 'Item tidak ditemukan.' });
    const b = req.body ?? {};
    const newStok = b.stokSaatIni != null ? Number(b.stokSaatIni) : inv.stokSaatIni;
    const newBeli = b.hargaBeli != null ? Number(b.hargaBeli) : inv.hargaBeli;
    const newJual = b.hargaJual != null ? Number(b.hargaJual) : inv.hargaJual;
    const qtyDelta = newStok - inv.stokSaatIni;

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.warmindoInventory.update({
        where: { id: invId },
        data: {
          stokSaatIni: newStok,
          hargaBeli: newBeli,
          hargaJual: newJual,
        },
      });
      if (qtyDelta !== 0) {
        await tx.warmindoStockMovement.create({
          data: {
            warmindoId: outletId,
            inventoryId: invId,
            namaBahan: inv.namaBahan,
            movementType: 'adjustment',
            qty: qtyDelta,
            satuan: inv.satuan,
            reason: 'manual_adjustment',
          },
        });
      }
      return u;
    });
    return updated;
  });

  const execRestock = async (req: any, reply: any) => {
    const warmindoId = await requireWarmindoStaffOutletId(req.user, reply);
    if (warmindoId == null) return;
    const b = req.body ?? {};
    const inventoryId = Number(b.inventoryId);
    const qty = Number(b.qty);
    const unitCost = Number(b.unitCost);
    if (!Number.isFinite(inventoryId) || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      return reply.code(400).send({ error: 'inventoryId, qty (>0), dan unitCost wajib valid.' });
    }
    const inv = await prisma.warmindoInventory.findFirst({ where: { id: inventoryId, warmindoId } });
    if (!inv) return reply.code(404).send({ error: 'Item tidak ditemukan.' });
    const amount = qty * unitCost;
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.warmindoInventory.update({
        where: { id: inventoryId },
        data: { stokSaatIni: { increment: qty } },
      });
      await tx.warmindoStockMovement.create({
        data: {
          warmindoId,
          inventoryId,
          namaBahan: inv.namaBahan,
          movementType: 'masuk',
          qty,
          satuan: inv.satuan,
          reason: 'restock',
        },
      });
      await tx.warmindoCashflowLedger.create({
        data: {
          warmindoId,
          direction: 'out',
          kategori: 'pembelian_bahan',
          amount,
          description: `Restock ${inv.namaBahan}`,
          referenceType: 'inventory_restock',
          referenceId: inventoryId,
        },
      });
      return u;
    });
    return reply.code(201).send(updated);
  };

  app.post('/restock', { preHandler: authScope(app) }, execRestock);
  app.post('/inventory/restock', { preHandler: authScope(app) }, execRestock);

  app.post('/pengeluaran', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const warmindoId = await requireWarmindoStaffOutletId(req.user, reply);
    if (warmindoId == null) return;
    const b = req.body ?? {};
    const jumlah = Number(b.jumlah);
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      return reply.code(400).send({ error: 'jumlah wajib angka positif.' });
    }
    const created = await prisma.$transaction(async (tx) => {
      const p = await tx.warmindoPengeluaran.create({
        data: {
          warmindoId,
          kategori: String(b.kategori ?? 'lainnya').slice(0, 30),
          deskripsi: String(b.deskripsi ?? '').slice(0, 300),
          jumlah,
        },
      });
      await tx.warmindoCashflowLedger.create({
        data: {
          warmindoId,
          direction: 'out',
          kategori: String(b.kategori ?? 'pengeluaran').slice(0, 50),
          amount: jumlah,
          description: p.deskripsi || p.kategori,
          referenceType: 'pengeluaran',
          referenceId: p.id,
        },
      });
      return p;
    });
    return reply.code(201).send(created);
  });

  app.post('/closing', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const user = req.user as any;
    const warmindoId = await requireWarmindoStaffOutletId(user, reply);
    if (warmindoId == null) return;
    const b = req.body ?? {};
    const cashActual = Number(b.cashActual);
    if (!Number.isFinite(cashActual)) {
      return reply.code(400).send({ error: 'cashActual wajib angka.' });
    }
    const today = startToday();
    const end = endToday();
    const dup = await prisma.warmindoDailyClosing.findUnique({
      where: { warmindoId_tanggal: { warmindoId, tanggal: today } },
    });
    if (dup) return reply.code(409).send({ error: 'Hari ini sudah ditutup' });

    const [trxAgg, pengAgg] = await Promise.all([
      prisma.warmindoTransaksi.aggregate({
        where: { warmindoId, tanggal: { gte: today, lte: end } },
        _sum: { totalOmzet: true, grossProfit: true },
      }),
      prisma.warmindoPengeluaran.aggregate({
        where: { warmindoId, tanggal: { gte: today, lte: end } },
        _sum: { jumlah: true },
      }),
    ]);
    const totalSales = trxAgg._sum.totalOmzet ?? 0;
    const totalExpenses = pengAgg._sum.jumlah ?? 0;
    const grossProfit = trxAgg._sum.grossProfit ?? 0;
    const netProfit = grossProfit - totalExpenses;
    const cashExpected = netProfit;
    const variance = cashActual - cashExpected;
    const isoDay = today.toISOString().split('T')[0];
    const closing = await prisma.warmindoDailyClosing.create({
      data: {
        kodeClosing: `CLOSE-${warmindoId}-${isoDay}`,
        warmindoId,
        tanggal: today,
        totalSales,
        totalExpenses,
        cashExpected,
        cashActual,
        variance,
        status: 'closed',
        closedBy: user.userId ?? null,
        notes: b.notes != null && String(b.notes).trim() !== '' ? String(b.notes) : null,
      },
    });
    const varianceStatus = variance > 5000 ? 'surplus' : variance < -5000 ? 'deficit' : 'balance';
    return reply.code(201).send({ ...closing, varianceStatus });
  });

  app.get('/closing', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const warmindoId = await requireWarmindoStaffOutletId(req.user, reply);
    if (warmindoId == null) return;
    const rows = await prisma.warmindoDailyClosing.findMany({
      where: { warmindoId },
      orderBy: { tanggal: 'desc' },
      take: 30,
    });
    return { closings: rows };
  });

  app.get('/signal', { preHandler: authScope(app) }, async (req: any, reply: any) => {
    const warmindoId = await requireWarmindoStaffOutletId(req.user, reply);
    if (warmindoId == null) return;
    const outlet = await prisma.warmindoOutlet.findUnique({ where: { id: warmindoId } });
    if (!outlet) return reply.code(404).send({ error: 'Outlet tidak ada.' });

    const signals: { type: string; severity: 'low' | 'medium' | 'high'; message: string; items?: string[]; data?: unknown }[] = [];

    const lowStock = await prisma.warmindoInventory.findMany({
      where: { warmindoId, stokMinimum: { gt: 0 } },
    });
    const lowStockItems = lowStock.filter((i) => i.stokSaatIni <= i.stokMinimum);
    if (lowStockItems.length > 0) {
      signals.push({
        type: 'low_stock',
        severity: 'medium',
        message: `${lowStockItems.length} bahan hampir habis`,
        items: lowStockItems.map((i) => i.namaBahan),
      });
    }

    const today0 = startToday();
    const endD = endToday();
    const dailyOmzet: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today0);
      d.setDate(d.getDate() - i);
      const { start, end: ed } = dayBounds(d);
      const a = await prisma.warmindoTransaksi.aggregate({
        where: { warmindoId, tanggal: { gte: start, lte: ed } },
        _sum: { totalOmzet: true },
      });
      dailyOmzet.push(a._sum.totalOmzet ?? 0);
    }
    if (dailyOmzet.length >= 7) {
      const prev4avg = (dailyOmzet[0] + dailyOmzet[1] + dailyOmzet[2] + dailyOmzet[3]) / 4;
      const last3avg = (dailyOmzet[4] + dailyOmzet[5] + dailyOmzet[6]) / 3;
      if (prev4avg > 0 && last3avg < prev4avg * 0.85) {
        signals.push({
          type: 'revenue_decline',
          severity: 'high',
          message: 'Omzet 3 hari terakhir turun >15% dari 4 hari sebelumnya',
          data: { last3avg: Math.round(last3avg), prev4avg: Math.round(prev4avg) },
        });
      }
    }

    const todayTrx = await prisma.warmindoTransaksi.aggregate({
      where: { warmindoId, tanggal: { gte: today0, lte: endD } },
      _sum: { totalOmzet: true },
    });
    const todayOmzet = todayTrx._sum.totalOmzet ?? 0;
    const tgt = outlet.targetOmzetHarian ?? 0;
    if (tgt > 0) {
      const pct = todayOmzet / tgt;
      if (pct < 0.5) {
        signals.push({
          type: 'target_miss',
          severity: 'medium',
          message: `Target harian baru tercapai ${Math.round(pct * 100)}%`,
          data: { target: tgt, actual: todayOmzet },
        });
      }
    }

    const weekStart = new Date(today0);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const closings7 = await prisma.warmindoDailyClosing.findMany({
      where: { warmindoId, tanggal: { gte: weekStart, lte: endD } },
    });
    const bigVariance = closings7.filter((c) => Math.abs(c.variance) > 100_000);
    if (bigVariance.length > 0) {
      signals.push({
        type: 'cash_variance',
        severity: 'high',
        message: `${bigVariance.length} hari dengan selisih kas >100rb`,
        data: bigVariance.map((c) => ({ tanggal: c.tanggal, variance: c.variance })),
      });
    }

    const overallHealth: 'sehat' | 'perhatian' | 'warning' = signals.some((s) => s.severity === 'high')
      ? 'warning'
      : signals.length > 0
        ? 'perhatian'
        : 'sehat';

    return {
      warmindoId,
      namaOutlet: outlet.namaOutlet,
      overallHealth,
      signals,
    };
  });
}
