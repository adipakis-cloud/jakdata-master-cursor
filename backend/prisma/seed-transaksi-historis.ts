/**
 * Seed 30 days of synthetic Warmindo transaction history (transaksi + line items + cashflow + daily closings).
 * Idempotent closings via createMany skipDuplicates on unique kodeClosing / (warmindoId, tanggal).
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const MENU = [
  { name: 'Indomie Goreng', price: 5000, hpp: 3000 },
  { name: 'Indomie Kuah', price: 5000, hpp: 3000 },
  { name: 'Indomie Goreng + Telur', price: 8000, hpp: 4500 },
  { name: 'Nasi + Telur', price: 10000, hpp: 5500 },
  { name: 'Nasi + Ayam', price: 15000, hpp: 8000 },
  { name: 'Kopi Hitam', price: 3000, hpp: 1000 },
  { name: 'Kopi Susu', price: 5000, hpp: 2000 },
  { name: 'Teh Manis', price: 3000, hpp: 800 },
  { name: 'Es Teh', price: 4000, hpp: 1000 },
  { name: 'Air Mineral', price: 3000, hpp: 1500 },
  { name: 'Telur Dadar', price: 6000, hpp: 3000 },
  { name: 'Mie Goreng Spesial', price: 12000, hpp: 6000 },
  { name: 'Paket Hemat (Mie+Teh)', price: 7000, hpp: 4000 },
  { name: 'Gorengan (5 pcs)', price: 5000, hpp: 2500 },
  { name: 'Roti Bakar', price: 8000, hpp: 4000 },
] as const;

type DraftItem = {
  productName: string;
  qty: number;
  unitPrice: number;
  unitHpp: number;
};

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function getPerformanceMultiplier(outletId: number): number {
  const rng = seededRandom(outletId * 7919);
  const cat = outletId % 10;
  if (cat <= 1) return 1.2 + rng() * 0.3;
  if (cat <= 6) return 0.7 + rng() * 0.4;
  if (cat <= 8) return 0.3 + rng() * 0.4;
  return 0.1 + rng() * 0.2;
}

function getDailyTrxCount(date: Date, multiplier: number, rng: () => number): number {
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const minBase = isWeekend ? 20 : 15;
  const maxBase = isWeekend ? 35 : 25;
  const base = minBase + Math.floor(rng() * (maxBase - minBase + 1));
  return Math.max(5, Math.round(base * multiplier));
}

const OVERNIGHT_HOURS = [22, 23, 0, 1, 2, 3, 4, 5, 6] as const;
const OFFPEAK_DAY_HOURS = [9, 10, 11, 14, 15, 16, 17] as const;

function pickOvernightHour(rng: () => number): number {
  return OVERNIGHT_HOURS[Math.floor(rng() * OVERNIGHT_HOURS.length)];
}

function pickPeakOrDayHour(rng: () => number): number {
  const r = rng();
  if (r < 0.3) return 7 + Math.floor(rng() * 3);
  if (r < 0.55) return 12 + Math.floor(rng() * 3);
  if (r < 0.8) return 18 + Math.floor(rng() * 4);
  return OFFPEAK_DAY_HOURS[Math.floor(rng() * OFFPEAK_DAY_HOURS.length)];
}

function randomItems(rng: () => number): DraftItem[] {
  const count = 1 + Math.floor(rng() * 3);
  const items: DraftItem[] = [];
  for (let i = 0; i < count; i++) {
    const menu = MENU[Math.floor(rng() * MENU.length)];
    items.push({
      productName: menu.name,
      qty: 1 + Math.floor(rng() * 2),
      unitPrice: menu.price,
      unitHpp: menu.hpp,
    });
  }
  return items;
}

function metodeBayar(rng: () => number): string {
  const r = rng();
  if (r < 0.7) return 'tunai';
  if (r < 0.85) return 'qris';
  return 'transfer';
}

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function atNoonLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log('Seeding 30-day transaction history...');

  const outlets = await prisma.warmindoOutlet.findMany({
    where: { aktif: true },
    select: { id: true },
  });

  console.log(`Outlets: ${outlets.length}`);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let totalTrx = 0;
  let totalLineItems = 0;
  let totalCashflow = 0;

  for (const outlet of outlets) {
    const multiplier = getPerformanceMultiplier(outlet.id);
    const rng = seededRandom(outlet.id * 31337);

    const lineBuffer: Prisma.WarmindoSaleLineItemCreateManyInput[] = [];
    const cashBuffer: Prisma.WarmindoCashflowLedgerCreateManyInput[] = [];
    const closingRows: Prisma.WarmindoDailyClosingCreateManyInput[] = [];

    const flushLines = async () => {
      for (const part of chunk(lineBuffer, 800)) {
        if (part.length === 0) continue;
        await prisma.warmindoSaleLineItem.createMany({ data: part });
        totalLineItems += part.length;
      }
      lineBuffer.length = 0;
    };

    const flushCash = async () => {
      for (const part of chunk(cashBuffer, 800)) {
        if (part.length === 0) continue;
        await prisma.warmindoCashflowLedger.createMany({ data: part });
        for (const row of part) totalCashflow += row.amount;
      }
      cashBuffer.length = 0;
    };

    for (let d = 29; d >= 0; d--) {
      const date = new Date(todayEnd);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - d);

      const trxCount = getDailyTrxCount(date, multiplier, rng);
      const overnightCount = Math.min(2 + Math.floor(rng() * 2), trxCount);

      const payloads: Prisma.WarmindoTransaksiCreateManyInput[] = [];

      for (let t = 0; t < trxCount; t++) {
        const items = randomItems(rng);
        const totalOmzet = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const totalHpp = items.reduce((s, i) => s + i.qty * i.unitHpp, 0);
        const grossProfit = totalOmzet - totalHpp;
        const hour = t < overnightCount ? pickOvernightHour(rng) : pickPeakOrDayHour(rng);
        const trxDate = new Date(date);
        trxDate.setHours(hour, Math.floor(rng() * 60), 0, 0);

        payloads.push({
          warmindoId: outlet.id,
          tanggal: trxDate,
          totalOmzet,
          totalHpp,
          grossProfit,
          jumlahItem: items.reduce((s, i) => s + i.qty, 0),
          metodeBayar: metodeBayar(rng),
          items: items as unknown as Prisma.InputJsonValue,
          catatan: null,
        });
      }

      if (payloads.length === 0) continue;

      const created = await prisma.warmindoTransaksi.createManyAndReturn({
        data: payloads,
      });

      totalTrx += created.length;

      let daySales = 0;
      for (const trx of created) {
        daySales += trx.totalOmzet;
        const items = trx.items as unknown as DraftItem[];
        if (Array.isArray(items)) {
          for (const item of items) {
            const qty = item.qty || 1;
            const unitPrice = item.unitPrice ?? 0;
            const unitHpp = item.unitHpp ?? 0;
            lineBuffer.push({
              transaksiId: trx.id,
              warmindoId: outlet.id,
              productName: item.productName || 'Unknown',
              qty,
              unitPrice,
              unitHpp,
              total: qty * unitPrice,
              grossProfit: qty * (unitPrice - unitHpp),
            });
          }
        }

        cashBuffer.push({
          warmindoId: outlet.id,
          tanggal: trx.tanggal,
          direction: 'in',
          kategori: 'penjualan',
          amount: trx.totalOmzet,
          description: 'Penjualan harian',
          referenceType: 'transaksi',
          referenceId: trx.id,
        });
      }

      if (d >= 1) {
        const variance = Math.floor((rng() - 0.5) * 50000);
        const dk = dateKeyLocal(date);
        closingRows.push({
          kodeClosing: `CLOSE-${outlet.id}-${dk}`,
          warmindoId: outlet.id,
          tanggal: atNoonLocal(date),
          totalSales: daySales,
          totalExpenses: Math.floor(daySales * 0.1),
          cashExpected: Math.floor(daySales * 0.9),
          cashActual: Math.floor(daySales * 0.9) + variance,
          variance,
          status: 'closed',
          closedBy: null,
          notes: null,
        });
      }

      if (lineBuffer.length >= 4000) await flushLines();
      if (cashBuffer.length >= 4000) await flushCash();
    }

    await flushLines();
    await flushCash();

    if (closingRows.length > 0) {
      for (const part of chunk(closingRows, 500)) {
        await prisma.warmindoDailyClosing.createMany({
          data: part,
          skipDuplicates: true,
        });
      }
    }

    process.stdout.write('.');
  }

  console.log('\n=== TRANSAKSI HISTORIS SELESAI ===');
  console.log('Total transaksi    :', totalTrx);
  console.log('Total line items   :', totalLineItems);
  console.log('Total omzet 30 hari: Rp', Math.round(totalCashflow).toLocaleString('id-ID'));
  if (outlets.length > 0) {
    console.log(
      'Rata-rata per outlet: Rp',
      Math.round(totalCashflow / outlets.length).toLocaleString('id-ID'),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
