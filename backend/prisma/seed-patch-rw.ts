/**
 * Append missing RW/RT per kelurahan to approach BPS 2024 targets (Dapil 3).
 * No deletes. Upsert-safe: only creates new RW/RT rows.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAPIL3_KOTA = ['3172', '3173', '3101'] as const;

function pad(n: number, len = 3) {
  return String(n).padStart(len, '0');
}

/** 1-based RW ordinal within kelurahan → RT count for new RW rows. */
function rtCountForRwOrdinal(ord: number): number {
  if (ord <= 5) return 10;
  if (ord <= 10) return 11;
  if (ord <= 15) return 10;
  return 9;
}

type TargetRow = { kotaKode: string; kecamatan: string; kelurahan: string; targetRw: number };

const TARGETS: TargetRow[] = [
  // Jakarta Utara 3172
  { kotaKode: '3172', kecamatan: 'Penjaringan', kelurahan: 'Penjaringan', targetRw: 18 },
  { kotaKode: '3172', kecamatan: 'Penjaringan', kelurahan: 'Pluit', targetRw: 22 },
  { kotaKode: '3172', kecamatan: 'Penjaringan', kelurahan: 'Pejagalan', targetRw: 16 },
  { kotaKode: '3172', kecamatan: 'Penjaringan', kelurahan: 'Kamal Muara', targetRw: 8 },
  { kotaKode: '3172', kecamatan: 'Penjaringan', kelurahan: 'Kapuk Muara', targetRw: 14 },
  { kotaKode: '3172', kecamatan: 'Pademangan', kelurahan: 'Pademangan Timur', targetRw: 10 },
  { kotaKode: '3172', kecamatan: 'Pademangan', kelurahan: 'Pademangan Barat', targetRw: 16 },
  { kotaKode: '3172', kecamatan: 'Pademangan', kelurahan: 'Ancol', targetRw: 9 },
  { kotaKode: '3172', kecamatan: 'Tanjung Priok', kelurahan: 'Tanjung Priok', targetRw: 13 },
  { kotaKode: '3172', kecamatan: 'Tanjung Priok', kelurahan: 'Sunter Agung', targetRw: 20 },
  { kotaKode: '3172', kecamatan: 'Tanjung Priok', kelurahan: 'Papanggo', targetRw: 14 },
  { kotaKode: '3172', kecamatan: 'Tanjung Priok', kelurahan: 'Sungai Bambu', targetRw: 12 },
  { kotaKode: '3172', kecamatan: 'Tanjung Priok', kelurahan: 'Kebon Bawang', targetRw: 14 },
  { kotaKode: '3172', kecamatan: 'Tanjung Priok', kelurahan: 'Sunter Jaya', targetRw: 18 },
  { kotaKode: '3172', kecamatan: 'Tanjung Priok', kelurahan: 'Warakas', targetRw: 13 },
  { kotaKode: '3172', kecamatan: 'Koja', kelurahan: 'Koja', targetRw: 11 },
  { kotaKode: '3172', kecamatan: 'Koja', kelurahan: 'Tugu Utara', targetRw: 19 },
  { kotaKode: '3172', kecamatan: 'Koja', kelurahan: 'Tugu Selatan', targetRw: 12 },
  { kotaKode: '3172', kecamatan: 'Koja', kelurahan: 'Lagoa', targetRw: 18 },
  { kotaKode: '3172', kecamatan: 'Koja', kelurahan: 'Rawa Badak Utara', targetRw: 11 },
  { kotaKode: '3172', kecamatan: 'Koja', kelurahan: 'Rawa Badak Selatan', targetRw: 11 },
  { kotaKode: '3172', kecamatan: 'Kelapa Gading', kelurahan: 'Kelapa Gading Barat', targetRw: 22 },
  { kotaKode: '3172', kecamatan: 'Kelapa Gading', kelurahan: 'Kelapa Gading Timur', targetRw: 27 },
  { kotaKode: '3172', kecamatan: 'Kelapa Gading', kelurahan: 'Pegangsaan Dua', targetRw: 21 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Cilincing', targetRw: 10 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Semper Barat', targetRw: 16 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Semper Timur', targetRw: 12 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Rorotan', targetRw: 14 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Marunda', targetRw: 8 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Kali Baru', targetRw: 11 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Sukapura', targetRw: 13 },
  { kotaKode: '3172', kecamatan: 'Cilincing', kelurahan: 'Tugu', targetRw: 7 },
  // Jakarta Barat 3173
  { kotaKode: '3173', kecamatan: 'Cengkareng', kelurahan: 'Cengkareng Barat', targetRw: 15 },
  { kotaKode: '3173', kecamatan: 'Cengkareng', kelurahan: 'Cengkareng Timur', targetRw: 13 },
  { kotaKode: '3173', kecamatan: 'Cengkareng', kelurahan: 'Duri Kosambi', targetRw: 12 },
  { kotaKode: '3173', kecamatan: 'Cengkareng', kelurahan: 'Kapuk', targetRw: 16 },
  { kotaKode: '3173', kecamatan: 'Cengkareng', kelurahan: 'Kedaung Kali Angke', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Cengkareng', kelurahan: 'Rawa Buaya', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Grogol Petamburan', kelurahan: 'Grogol', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Grogol Petamburan', kelurahan: 'Tomang', targetRw: 14 },
  { kotaKode: '3173', kecamatan: 'Grogol Petamburan', kelurahan: 'Jelambar', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Grogol Petamburan', kelurahan: 'Jelambar Baru', targetRw: 9 },
  { kotaKode: '3173', kecamatan: 'Grogol Petamburan', kelurahan: 'Tanjung Duren Utara', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Grogol Petamburan', kelurahan: 'Tanjung Duren Selatan', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Grogol Petamburan', kelurahan: 'Wijaya Kusuma', targetRw: 4 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Tambora', targetRw: 13 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Kali Anyar', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Duri Utara', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Tanah Sereal', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Kerendang', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Jembatan Besi', targetRw: 9 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Angke', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Jembatan Lima', targetRw: 9 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Duri Selatan', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Pekojan', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Tambora', kelurahan: 'Roa Malaka', targetRw: 6 },
  { kotaKode: '3173', kecamatan: 'Kebon Jeruk', kelurahan: 'Kebon Jeruk', targetRw: 11 },
  { kotaKode: '3173', kecamatan: 'Kebon Jeruk', kelurahan: 'Kedoya Utara', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Kebon Jeruk', kelurahan: 'Kedoya Selatan', targetRw: 9 },
  { kotaKode: '3173', kecamatan: 'Kebon Jeruk', kelurahan: 'Duri Kepa', targetRw: 12 },
  { kotaKode: '3173', kecamatan: 'Kebon Jeruk', kelurahan: 'Sukabumi Utara', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Kebon Jeruk', kelurahan: 'Sukabumi Selatan', targetRw: 7 },
  { kotaKode: '3173', kecamatan: 'Kebon Jeruk', kelurahan: 'Kelapa Dua', targetRw: 4 },
  { kotaKode: '3173', kecamatan: 'Palmerah', kelurahan: 'Palmerah', targetRw: 12 },
  { kotaKode: '3173', kecamatan: 'Palmerah', kelurahan: 'Slipi', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Palmerah', kelurahan: 'Kota Bambu Utara', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Palmerah', kelurahan: 'Kota Bambu Selatan', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Palmerah', kelurahan: 'Jati Pulo', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Palmerah', kelurahan: 'Kemanggisan', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Kalideres', kelurahan: 'Kalideres', targetRw: 15 },
  { kotaKode: '3173', kecamatan: 'Kalideres', kelurahan: 'Semanan', targetRw: 14 },
  { kotaKode: '3173', kecamatan: 'Kalideres', kelurahan: 'Tegal Alur', targetRw: 18 },
  { kotaKode: '3173', kecamatan: 'Kalideres', kelurahan: 'Pegadungan', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Kalideres', kelurahan: 'Kamal', targetRw: 6 },
  { kotaKode: '3173', kecamatan: 'Kembangan', kelurahan: 'Kembangan Utara', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Kembangan', kelurahan: 'Kembangan Selatan', targetRw: 9 },
  { kotaKode: '3173', kecamatan: 'Kembangan', kelurahan: 'Srengseng', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Kembangan', kelurahan: 'Joglo', targetRw: 9 },
  { kotaKode: '3173', kecamatan: 'Kembangan', kelurahan: 'Meruya Utara', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Kembangan', kelurahan: 'Meruya Selatan', targetRw: 6 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Tamansari', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Krukut', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Maphar', targetRw: 7 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Tangki', targetRw: 7 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Mangga Besar', targetRw: 8 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Kemukus', targetRw: 6 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Pinangsia', targetRw: 10 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Glodok', targetRw: 9 },
  { kotaKode: '3173', kecamatan: 'Tamansari', kelurahan: 'Keagungan', targetRw: 7 },
  // Kepulauan Seribu 3101
  { kotaKode: '3101', kecamatan: 'Kepulauan Seribu Utara', kelurahan: 'Pulau Panggang', targetRw: 5 },
  { kotaKode: '3101', kecamatan: 'Kepulauan Seribu Utara', kelurahan: 'Pulau Kelapa', targetRw: 6 },
  { kotaKode: '3101', kecamatan: 'Kepulauan Seribu Utara', kelurahan: 'Pulau Harapan', targetRw: 4 },
  { kotaKode: '3101', kecamatan: 'Kepulauan Seribu Selatan', kelurahan: 'Pulau Tidung', targetRw: 6 },
  { kotaKode: '3101', kecamatan: 'Kepulauan Seribu Selatan', kelurahan: 'Pulau Pari', targetRw: 3 },
  { kotaKode: '3101', kecamatan: 'Kepulauan Seribu Selatan', kelurahan: 'Pulau Untung Jawa', targetRw: 3 },
];

async function findKel(row: TargetRow) {
  return prisma.kelurahan.findFirst({
    where: {
      nama: row.kelurahan,
      kecamatan: { nama: row.kecamatan, kota: { kode: row.kotaKode } },
    },
    select: { id: true, nama: true },
  });
}

async function main() {
  let totalRwAdded = 0;
  let totalRtAdded = 0;

  for (const row of TARGETS) {
    const kel = await findKel(row);
    if (!kel) {
      console.warn(`[skip] kelurahan not found: ${row.kotaKode} / ${row.kecamatan} / ${row.kelurahan}`);
      continue;
    }

    const existing = await prisma.rW.findMany({
      where: { kelurahanId: kel.id },
      select: { id: true, nomor: true },
    });
    const n = existing.length;
    const need = row.targetRw - n;
    if (need <= 0) {
      console.log(`[ok] ${row.kecamatan} / ${kel.nama}: RW ${n} >= target ${row.targetRw}, skip`);
      continue;
    }

    const maxNum = existing.reduce((m, r) => Math.max(m, parseInt(r.nomor, 10) || 0), 0);

    const beforeIds = new Set(existing.map((r) => r.id));
    const rwRows = Array.from({ length: need }, (_, j) => ({
      kelurahanId: kel.id,
      nomor: pad(maxNum + j + 1),
    }));
    await prisma.rW.createMany({ data: rwRows, skipDuplicates: true });

    const afterRws = await prisma.rW.findMany({
      where: { kelurahanId: kel.id },
      select: { id: true },
    });
    const newRwIds = afterRws.filter((r) => !beforeIds.has(r.id)).map((r) => r.id);
    totalRwAdded += newRwIds.length;

    const allSorted = await prisma.rW.findMany({
      where: { kelurahanId: kel.id },
      orderBy: { nomor: 'asc' },
      select: { id: true, nomor: true },
    });

    let rtBatch = 0;
    for (const rwId of newRwIds) {
      const ordinal = allSorted.findIndex((r) => r.id === rwId) + 1;
      if (ordinal < 1) continue;
      const nRt = rtCountForRwOrdinal(ordinal);
      const rtData = Array.from({ length: nRt }, (_, i) => ({
        rwId,
        nomor: pad(i + 1),
        jumlahKk: 50,
        targetWarga: 150,
      }));
      const rtRes = await prisma.rT.createMany({ data: rtData, skipDuplicates: true });
      rtBatch += rtRes.count;
    }

    totalRtAdded += rtBatch;
    console.log(
      `[patch] ${row.kecamatan} / ${kel.nama}: was ${n} RW → target ${row.targetRw}; +${newRwIds.length} RW, +${rtBatch} RT (createMany + skipDuplicates)`,
    );
  }

  console.log('\n=== PATCH SUMMARY ===');
  console.log('Total RW rows inserted (createMany):', totalRwAdded);
  console.log('Total RT rows inserted (createMany):', totalRtAdded);

  for (const kode of DAPIL3_KOTA) {
    const kota = await prisma.kota.findUnique({ where: { kode }, select: { nama: true } });
    const [rw, rt] = await Promise.all([
      prisma.rW.count({ where: { kelurahan: { kecamatan: { kota: { kode } } } } }),
      prisma.rT.count({ where: { rw: { kelurahan: { kecamatan: { kota: { kode } } } } } }),
    ]);
    console.log(`Kota ${kode} (${kota?.nama ?? '?'}): RW=${rw}, RT=${rt}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
