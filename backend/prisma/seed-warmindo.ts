/**
 * Pilot: 1 Warmindo outlet per kelurahan — Jakarta Utara (3172), Jakarta Barat (3173), Kepulauan Seribu (3101).
 * Upserts outlet, inventory, employees; assigns manager from koordinator.kel.{kode}@jakdata.id (Jakut) or + fallback koordinator.kelurahan@jakdata.id (Jakbar / Kepulauan Seribu).
 */
import { PrismaClient, WarmindoStatus } from '@prisma/client';

const prisma = new PrismaClient();

const INVENTORY_SEED: Array<{
  namaBahan: string;
  satuan: string;
  stokSaatIni: number;
  stokMinimum: number;
  hargaBeli: number;
  hargaJual: number;
}> = [
  { namaBahan: 'Indomie Goreng', satuan: 'pcs', stokSaatIni: 200, stokMinimum: 50, hargaBeli: 3000, hargaJual: 5000 },
  { namaBahan: 'Indomie Kuah', satuan: 'pcs', stokSaatIni: 200, stokMinimum: 50, hargaBeli: 3000, hargaJual: 5000 },
  { namaBahan: 'Telur Ayam', satuan: 'butir', stokSaatIni: 100, stokMinimum: 30, hargaBeli: 2000, hargaJual: 3000 },
  { namaBahan: 'Minyak Goreng', satuan: 'liter', stokSaatIni: 20, stokMinimum: 5, hargaBeli: 18000, hargaJual: 0 },
  { namaBahan: 'Gas LPG 3kg', satuan: 'tabung', stokSaatIni: 5, stokMinimum: 2, hargaBeli: 20000, hargaJual: 0 },
  { namaBahan: 'Beras', satuan: 'kg', stokSaatIni: 50, stokMinimum: 10, hargaBeli: 12000, hargaJual: 0 },
  { namaBahan: 'Kopi Sachet', satuan: 'pcs', stokSaatIni: 100, stokMinimum: 20, hargaBeli: 1500, hargaJual: 3000 },
  { namaBahan: 'Teh Celup', satuan: 'pcs', stokSaatIni: 100, stokMinimum: 20, hargaBeli: 500, hargaJual: 2000 },
  { namaBahan: 'Air Mineral Galon', satuan: 'galon', stokSaatIni: 10, stokMinimum: 3, hargaBeli: 20000, hargaJual: 0 },
  { namaBahan: 'Gula Pasir', satuan: 'kg', stokSaatIni: 10, stokMinimum: 3, hargaBeli: 15000, hargaJual: 0 },
];

const EMPLOYEE_TEMPLATE = (kelNama: string) =>
  [
    { role: 'outlet_manager', nama: `Manager ${kelNama}`, gajiPokok: 4_000_000 },
    { role: 'kasir', nama: `Kasir 1 ${kelNama}`, gajiPokok: 3_000_000 },
    { role: 'kasir', nama: `Kasir 2 ${kelNama}`, gajiPokok: 3_000_000 },
    { role: 'dapur', nama: `Koki ${kelNama}`, gajiPokok: 2_800_000 },
    { role: 'operasional', nama: `Staff ${kelNama}`, gajiPokok: 2_500_000 },
  ] as const;

const EMPLOYEE_TEMPLATE_KEPSERIBU = (kelNama: string) =>
  [
    { role: 'outlet_manager', nama: `Manager ${kelNama}`, gajiPokok: 3_500_000 },
    { role: 'kasir', nama: `Kasir ${kelNama}`, gajiPokok: 2_800_000 },
    { role: 'dapur', nama: `Koki ${kelNama}`, gajiPokok: 2_500_000 },
  ] as const;

function kelEmailKode(kel: { kode: string | null; id: number }) {
  return (kel.kode && String(kel.kode).trim()) || `id${kel.id}`;
}

async function main() {
  const kelurahanList = await prisma.kelurahan.findMany({
    where: { kecamatan: { kota: { kode: '3172' } } },
    include: {
      kecamatan: true,
      rw: {
        orderBy: { nomor: 'asc' },
        take: 1,
        include: { rt: { orderBy: { nomor: 'asc' }, take: 1 } },
      },
    },
    orderBy: [{ kecamatanId: 'asc' }, { id: 'asc' }],
  });

  let outlets = 0;
  let inventoryRows = 0;
  let employees = 0;
  let managersSet = 0;

  for (let i = 0; i < kelurahanList.length; i++) {
    const kel = kelurahanList[i];
    const kodeOutlet = `WRM-JAKUT-${String(i + 1).padStart(3, '0')}`;
    const rtId = kel.rw[0]?.rt[0]?.id ?? null;

    const outlet = await prisma.warmindoOutlet.upsert({
      where: { kodeOutlet },
      update: {
        namaOutlet: `Warmindo ${kel.nama}`,
        kelurahanId: kel.id,
        rtId,
        alamat: `Kelurahan ${kel.nama}, Kec. ${kel.kecamatan.nama}`,
        status: WarmindoStatus.aktif,
        modalAwal: 50_000_000,
        targetOmzetHarian: 2_000_000,
        targetLabaBulanan: 15_000_000,
        biayaSewaBulanan: 3_000_000,
        karyawanTotal: 5,
        aktif: true,
        tanggalBuka: new Date('2026-01-01'),
      },
      create: {
        kodeOutlet,
        namaOutlet: `Warmindo ${kel.nama}`,
        kelurahanId: kel.id,
        rtId,
        alamat: `Kelurahan ${kel.nama}, Kec. ${kel.kecamatan.nama}`,
        status: WarmindoStatus.aktif,
        modalAwal: 50_000_000,
        targetOmzetHarian: 2_000_000,
        targetLabaBulanan: 15_000_000,
        biayaSewaBulanan: 3_000_000,
        karyawanTotal: 5,
        aktif: true,
        tanggalBuka: new Date('2026-01-01'),
      },
    });
    outlets++;

    const invRes = await prisma.warmindoInventory.createMany({
      data: INVENTORY_SEED.map((row) => ({
        warmindoId: outlet.id,
        namaBahan: row.namaBahan,
        satuan: row.satuan,
        stokSaatIni: row.stokSaatIni,
        stokMinimum: row.stokMinimum,
        hargaBeli: row.hargaBeli,
        hargaJual: row.hargaJual,
      })),
      skipDuplicates: true,
    });
    inventoryRows += invRes.count;

    const empTpl = EMPLOYEE_TEMPLATE(kel.nama);
    for (let j = 0; j < empTpl.length; j++) {
      const kodeEmployee = `EMP-${kodeOutlet}-${String(j + 1).padStart(2, '0')}`;
      await prisma.warmindoEmployee.upsert({
        where: { kodeEmployee },
        update: {
          warmindoId: outlet.id,
          nama: empTpl[j].nama,
          role: empTpl[j].role,
          gajiPokok: empTpl[j].gajiPokok,
          aktif: true,
        },
        create: {
          kodeEmployee,
          warmindoId: outlet.id,
          nama: empTpl[j].nama,
          role: empTpl[j].role,
          gajiPokok: empTpl[j].gajiPokok,
          aktif: true,
        },
      });
      employees++;
    }

    const mgrEmail = `koordinator.kel.${kelEmailKode(kel)}@jakdata.id`;
    const mgr = await prisma.user.findUnique({ where: { email: mgrEmail }, select: { id: true } });
    if (mgr) {
      await prisma.warmindoOutlet.update({
        where: { id: outlet.id },
        data: { managerUserId: mgr.id },
      });
      managersSet++;
    }

    console.log(`[warmindo] ${kodeOutlet} — ${kel.nama} (kel ${kel.id}) inv +${invRes.count} emp 5 mgr=${mgr ? 'yes' : 'no'}`);
  }

  const jakutCount = outlets;
  const jakutInventoryRows = inventoryRows;
  const jakutEmployees = employees;

  console.log('\n=== SEED WARMINDO JAKUT PILOT ===');
  console.log('Kelurahan processed:', kelurahanList.length);
  console.log('Outlets upserted:', outlets);
  console.log('Inventory rows inserted (createMany, may skip dup):', inventoryRows);
  console.log('Employee upserts:', employees);
  console.log('Manager linked:', managersSet);

  // ── Jakarta Barat (kota 3173) ─────────────────────────────────────────
  const kelurahanJakbar = await prisma.kelurahan.findMany({
    where: { kecamatan: { kota: { kode: '3173' } } },
    include: {
      kecamatan: true,
      rw: {
        orderBy: { nomor: 'asc' },
        take: 1,
        include: { rt: { orderBy: { nomor: 'asc' }, take: 1 } },
      },
    },
    orderBy: [{ kecamatan: { nama: 'asc' } }, { nama: 'asc' }],
  });

  let jakbarCount = 0;
  let jakbarInventoryRows = 0;
  let jakbarEmployees = 0;

  for (let i = 0; i < kelurahanJakbar.length; i++) {
    const kel = kelurahanJakbar[i];
    const kodeOutlet = `WRM-JAKBAR-${String(i + 1).padStart(3, '0')}`;
    const rtId = kel.rw[0]?.rt[0]?.id ?? null;

    const outlet = await prisma.warmindoOutlet.upsert({
      where: { kodeOutlet },
      update: {
        namaOutlet: `Warmindo ${kel.nama}`,
        kelurahanId: kel.id,
        rtId,
        alamat: `Kelurahan ${kel.nama}, Kec. ${kel.kecamatan.nama}`,
        status: WarmindoStatus.aktif,
        modalAwal: 50_000_000,
        targetOmzetHarian: 2_000_000,
        targetLabaBulanan: 15_000_000,
        biayaSewaBulanan: 3_000_000,
        karyawanTotal: 5,
        aktif: true,
        tanggalBuka: new Date('2026-01-01'),
      },
      create: {
        kodeOutlet,
        namaOutlet: `Warmindo ${kel.nama}`,
        kelurahanId: kel.id,
        rtId,
        alamat: `Kelurahan ${kel.nama}, Kec. ${kel.kecamatan.nama}`,
        status: WarmindoStatus.aktif,
        modalAwal: 50_000_000,
        targetOmzetHarian: 2_000_000,
        targetLabaBulanan: 15_000_000,
        biayaSewaBulanan: 3_000_000,
        karyawanTotal: 5,
        aktif: true,
        tanggalBuka: new Date('2026-01-01'),
      },
    });
    jakbarCount++;

    const invResJb = await prisma.warmindoInventory.createMany({
      data: INVENTORY_SEED.map((row) => ({
        warmindoId: outlet.id,
        namaBahan: row.namaBahan,
        satuan: row.satuan,
        stokSaatIni: row.stokSaatIni,
        stokMinimum: row.stokMinimum,
        hargaBeli: row.hargaBeli,
        hargaJual: row.hargaJual,
      })),
      skipDuplicates: true,
    });
    jakbarInventoryRows += invResJb.count;

    const empTplJb = EMPLOYEE_TEMPLATE(kel.nama);
    for (let j = 0; j < empTplJb.length; j++) {
      const kodeEmployee = `EMP-${kodeOutlet}-${String(j + 1).padStart(2, '0')}`;
      await prisma.warmindoEmployee.upsert({
        where: { kodeEmployee },
        update: {
          warmindoId: outlet.id,
          nama: empTplJb[j].nama,
          role: empTplJb[j].role,
          gajiPokok: empTplJb[j].gajiPokok,
          aktif: true,
        },
        create: {
          kodeEmployee,
          warmindoId: outlet.id,
          nama: empTplJb[j].nama,
          role: empTplJb[j].role,
          gajiPokok: empTplJb[j].gajiPokok,
          aktif: true,
        },
      });
      jakbarEmployees++;
    }

    const mgrEmailJb = `koordinator.kel.${kelEmailKode(kel)}@jakdata.id`;
    let mgrJb = await prisma.user.findUnique({ where: { email: mgrEmailJb }, select: { id: true } });
    if (!mgrJb) {
      mgrJb = await prisma.user.findUnique({ where: { email: 'koordinator.kelurahan@jakdata.id' }, select: { id: true } });
    }
    if (mgrJb) {
      await prisma.warmindoOutlet.update({
        where: { id: outlet.id },
        data: { managerUserId: mgrJb.id },
      });
    }

    console.log(`[warmindo jakbar] ${kodeOutlet} — ${kel.nama} (kel ${kel.id}) inv +${invResJb.count} emp 5 mgr=${mgrJb ? 'yes' : 'no'}`);
  }

  // ── Kepulauan Seribu (kota 3101) ──────────────────────────────────────
  const kelurahanKep = await prisma.kelurahan.findMany({
    where: { kecamatan: { kota: { kode: '3101' } } },
    include: {
      kecamatan: true,
      rw: {
        orderBy: { nomor: 'asc' },
        take: 1,
        include: { rt: { orderBy: { nomor: 'asc' }, take: 1 } },
      },
    },
    orderBy: [{ kecamatan: { nama: 'asc' } }, { nama: 'asc' }],
  });

  let kepseribuCount = 0;
  let kepseribuInventoryRows = 0;
  let kepseribuEmployees = 0;

  for (let i = 0; i < kelurahanKep.length; i++) {
    const kel = kelurahanKep[i];
    const kodeOutlet = `WRM-KEPSERIBU-${String(i + 1).padStart(3, '0')}`;
    const rtId = kel.rw[0]?.rt[0]?.id ?? null;

    const outlet = await prisma.warmindoOutlet.upsert({
      where: { kodeOutlet },
      update: {
        namaOutlet: `Warmindo ${kel.nama}`,
        kelurahanId: kel.id,
        rtId,
        alamat: `Kelurahan ${kel.nama}, Kec. ${kel.kecamatan.nama}`,
        status: WarmindoStatus.aktif,
        modalAwal: 30_000_000,
        targetOmzetHarian: 800_000,
        targetLabaBulanan: 6_000_000,
        biayaSewaBulanan: 1_000_000,
        karyawanTotal: 3,
        aktif: true,
        tanggalBuka: new Date('2026-01-01'),
      },
      create: {
        kodeOutlet,
        namaOutlet: `Warmindo ${kel.nama}`,
        kelurahanId: kel.id,
        rtId,
        alamat: `Kelurahan ${kel.nama}, Kec. ${kel.kecamatan.nama}`,
        status: WarmindoStatus.aktif,
        modalAwal: 30_000_000,
        targetOmzetHarian: 800_000,
        targetLabaBulanan: 6_000_000,
        biayaSewaBulanan: 1_000_000,
        karyawanTotal: 3,
        aktif: true,
        tanggalBuka: new Date('2026-01-01'),
      },
    });
    kepseribuCount++;

    const invResKep = await prisma.warmindoInventory.createMany({
      data: INVENTORY_SEED.map((row) => ({
        warmindoId: outlet.id,
        namaBahan: row.namaBahan,
        satuan: row.satuan,
        stokSaatIni: row.stokSaatIni,
        stokMinimum: row.stokMinimum,
        hargaBeli: row.hargaBeli,
        hargaJual: row.hargaJual,
      })),
      skipDuplicates: true,
    });
    kepseribuInventoryRows += invResKep.count;

    const empTplKep = EMPLOYEE_TEMPLATE_KEPSERIBU(kel.nama);
    for (let j = 0; j < empTplKep.length; j++) {
      const kodeEmployee = `EMP-${kodeOutlet}-${String(j + 1).padStart(2, '0')}`;
      await prisma.warmindoEmployee.upsert({
        where: { kodeEmployee },
        update: {
          warmindoId: outlet.id,
          nama: empTplKep[j].nama,
          role: empTplKep[j].role,
          gajiPokok: empTplKep[j].gajiPokok,
          aktif: true,
        },
        create: {
          kodeEmployee,
          warmindoId: outlet.id,
          nama: empTplKep[j].nama,
          role: empTplKep[j].role,
          gajiPokok: empTplKep[j].gajiPokok,
          aktif: true,
        },
      });
      kepseribuEmployees++;
    }

    const mgrEmailKep = `koordinator.kel.${kelEmailKode(kel)}@jakdata.id`;
    let mgrKep = await prisma.user.findUnique({ where: { email: mgrEmailKep }, select: { id: true } });
    if (!mgrKep) {
      mgrKep = await prisma.user.findUnique({ where: { email: 'koordinator.kelurahan@jakdata.id' }, select: { id: true } });
    }
    if (mgrKep) {
      await prisma.warmindoOutlet.update({
        where: { id: outlet.id },
        data: { managerUserId: mgrKep.id },
      });
    }

    console.log(`[warmindo kepseribu] ${kodeOutlet} — ${kel.nama} (kel ${kel.id}) inv +${invResKep.count} emp 3 mgr=${mgrKep ? 'yes' : 'no'}`);
  }

  const totalOutlets = jakutCount + jakbarCount + kepseribuCount;
  const totalEmp = jakutEmployees + jakbarEmployees + kepseribuEmployees;
  const totalInv = jakutInventoryRows + jakbarInventoryRows + kepseribuInventoryRows;

  console.log('\n=== WARMINDO NETWORK SEED COMPLETE ===');
  console.log('Jakarta Utara  :', jakutCount, 'outlets');
  console.log('Jakarta Barat  :', jakbarCount, 'outlets');
  console.log('Kepulauan Seribu:', kepseribuCount, 'outlets');
  console.log('TOTAL          :', totalOutlets, 'outlets');
  console.log('Total employees:', totalEmp);
  console.log('Total inventory rows:', totalInv);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
