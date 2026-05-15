/**
 * Seed realistic bantuan distribution with deliberate fairness anomalies.
 * No schema changes — createMany + skipDuplicates where applicable.
 */
import { DistribusiStatus, Prisma, PrismaClient, StatusEkonomi } from '@prisma/client';

const prisma = new PrismaClient();

type KeluargaRow = {
  id: number;
  namaKepala: string;
  noKk: string | null;
  rtId: number | null;
  statusEkonomi: StatusEkonomi;
  skorPrioritasBantuan: number;
};

const PROGRAM_DEFS = [
  {
    nama: 'Bantuan Pangan Non-Tunai (BPNT)',
    tipe: 'pangan',
    deskripsi: 'Bantuan pangan bulanan untuk keluarga pra-sejahtera',
    satuan: 'paket',
    nilaiPerSatuan: 200000,
    stokTotal: 500,
    stokTersisa: 500,
    sumber: 'Kemensos RI',
    tanggalMasuk: new Date('2026-01-01'),
    aktif: true,
  },
  {
    nama: 'Program Keluarga Harapan (PKH)',
    tipe: 'tunai',
    deskripsi: 'Bantuan tunai bersyarat untuk keluarga miskin',
    satuan: 'keluarga',
    nilaiPerSatuan: 750000,
    stokTotal: 300,
    stokTersisa: 300,
    sumber: 'Kemensos RI',
    tanggalMasuk: new Date('2026-01-01'),
    aktif: true,
  },
  {
    nama: 'Bantuan Langsung Tunai (BLT) Dana Desa',
    tipe: 'tunai',
    deskripsi: 'BLT dari dana kelurahan untuk warga terdampak',
    satuan: 'keluarga',
    nilaiPerSatuan: 300000,
    stokTotal: 200,
    stokTersisa: 200,
    sumber: 'Dana Kelurahan',
    tanggalMasuk: new Date('2026-02-01'),
    aktif: true,
  },
  {
    nama: 'Sembako Operasi Pasar',
    tipe: 'pangan',
    deskripsi: 'Paket sembako murah operasi pasar bulanan',
    satuan: 'paket',
    nilaiPerSatuan: 150000,
    stokTotal: 400,
    stokTersisa: 400,
    sumber: 'Pemda DKI',
    tanggalMasuk: new Date('2026-03-01'),
    aktif: true,
  },
] as const;

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randomDateInLastDays(days: number, rng: () => number): Date {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const ms = start.getTime() + Math.floor(rng() * (now.getTime() - start.getTime()));
  return new Date(ms);
}

function pickStatus(
  weights: { diterima: number; terjadwal?: number; tidak_hadir?: number },
  rng: () => number,
): DistribusiStatus {
  const r = rng();
  const t = weights.terjadwal ?? 0;
  const n = weights.tidak_hadir ?? 0;
  if (r < weights.diterima) return DistribusiStatus.diterima;
  if (r < weights.diterima + t) return DistribusiStatus.terjadwal;
  if (r < weights.diterima + t + n) return DistribusiStatus.tidak_hadir;
  return DistribusiStatus.diterima;
}

function pairKey(bantuanId: number, keluargaId: number): string {
  return `${bantuanId}:${keluargaId}`;
}

async function upsertBantuanByName(
  data: (typeof PROGRAM_DEFS)[number],
): Promise<{ id: number; nama: string; stokTotal: number; stokTersisa: number }> {
  const existing = await prisma.bantuan.findFirst({ where: { nama: data.nama } });
  if (existing) {
    return prisma.bantuan.update({
      where: { id: existing.id },
      data: {
        tipe: data.tipe,
        deskripsi: data.deskripsi,
        satuan: data.satuan,
        nilaiPerSatuan: data.nilaiPerSatuan,
        sumber: data.sumber,
        tanggalMasuk: data.tanggalMasuk,
        aktif: data.aktif,
      },
      select: { id: true, nama: true, stokTotal: true, stokTersisa: true },
    });
  }
  return prisma.bantuan.create({
    data: { ...data },
    select: { id: true, nama: true, stokTotal: true, stokTersisa: true },
  });
}

function capByStok<T>(selected: T[], stok: number): T[] {
  const cap = Math.floor(stok);
  return selected.slice(0, cap);
}

async function main() {
  console.log('Seeding bantuan distribution...');

  const programs = [];
  for (const def of PROGRAM_DEFS) {
    programs.push(await upsertBantuanByName(def));
  }
  const programCount = programs.length;

  const keluarga = await prisma.keluarga.findMany({
    select: {
      id: true,
      namaKepala: true,
      noKk: true,
      rtId: true,
      statusEkonomi: true,
      skorPrioritasBantuan: true,
    },
    orderBy: { skorPrioritasBantuan: 'desc' },
  });

  const existingPairs = new Set<string>();
  const existingRows = await prisma.bantuanPenerima.findMany({
    where: { keluargaId: { not: null } },
    select: { bantuanId: true, keluargaId: true },
  });
  for (const row of existingRows) {
    if (row.keluargaId != null) existingPairs.add(pairKey(row.bantuanId, row.keluargaId));
  }

  const rngGlobal = seededRandom(42_026_0515);

  const sangatMiskin = keluarga.filter((k) => k.statusEkonomi === StatusEkonomi.sangat_miskin);
  const uncoveredPool = [...sangatMiskin];
  shuffleInPlace(uncoveredPool, rngGlobal);
  const uncoveredCountTarget = Math.max(1, Math.floor(sangatMiskin.length * 0.15));
  const uncoveredSet = new Set(uncoveredPool.slice(0, uncoveredCountTarget).map((k) => k.id));

  const penerimaBuffer: Prisma.BantuanPenerimaCreateManyInput[] = [];
  let totalInserted = 0;

  const flushProgram = async (
    program: { id: number; nama: string; stokTotal: number },
    rows: Prisma.BantuanPenerimaCreateManyInput[],
  ): Promise<number> => {
    const fresh: Prisma.BantuanPenerimaCreateManyInput[] = [];
    for (const row of rows) {
      const kid = row.keluargaId!;
      const key = pairKey(program.id, kid);
      if (existingPairs.has(key)) continue;
      existingPairs.add(key);
      fresh.push(row);
    }
    if (fresh.length === 0) {
      console.log(`[${program.nama}] Distributed to: 0 keluarga (all duplicates skipped)`);
      return 0;
    }

    const result = await prisma.bantuanPenerima.createMany({
      data: fresh,
      skipDuplicates: true,
    });
    const count = result.count;
    totalInserted += count;

    const distributedTotal = await prisma.bantuanPenerima.count({
      where: { bantuanId: program.id },
    });
    await prisma.bantuan.update({
      where: { id: program.id },
      data: { stokTersisa: Math.max(0, program.stokTotal - distributedTotal) },
    });

    console.log(`[${program.nama}] Distributed to: ${count} keluarga`);
    return count;
  };

  const buildRow = (
    program: { id: number; nama: string },
    k: KeluargaRow,
    tanggalDiterima: Date,
    status: DistribusiStatus,
  ): Prisma.BantuanPenerimaCreateManyInput => ({
    bantuanId: program.id,
    keluargaId: k.id,
    namaPenerima: k.namaKepala,
    rtId: k.rtId,
    jumlahDiterima: 1,
    status,
    tanggalDiterima: status === DistribusiStatus.diterima ? tanggalDiterima : null,
    catatan: `Seed distribusi program ${program.nama}`,
  });

  const isExcluded = (k: KeluargaRow) => uncoveredSet.has(k.id);

  // PROGRAM 1 — BPNT
  {
    const program = programs[0];
    const rng = seededRandom(program.id * 1009);
    const eligible = keluarga.filter(
      (k) =>
        !isExcluded(k) &&
        (k.statusEkonomi === StatusEkonomi.sangat_miskin ||
          k.statusEkonomi === StatusEkonomi.miskin),
    );
    eligible.sort((a, b) => b.skorPrioritasBantuan - a.skorPrioritasBantuan);
    const take = Math.floor(eligible.length * 0.7);
    const selected = capByStok(eligible.slice(0, take), program.stokTotal);
    const rows = selected.map((k) =>
      buildRow(
        program,
        k,
        randomDateInLastDays(90, rng),
        pickStatus({ diterima: 0.8, terjadwal: 0.1, tidak_hadir: 0.1 }, rng),
      ),
    );
    await flushProgram(program, rows);
  }

  // PROGRAM 2 — PKH
  {
    const program = programs[1];
    const rng = seededRandom(program.id * 1009);
    const eligible = keluarga.filter(
      (k) =>
        !isExcluded(k) &&
        (k.statusEkonomi === StatusEkonomi.sangat_miskin ||
          k.statusEkonomi === StatusEkonomi.miskin ||
          k.statusEkonomi === StatusEkonomi.rentan),
    );
    eligible.sort((a, b) => b.skorPrioritasBantuan - a.skorPrioritasBantuan);
    const take = Math.floor(eligible.length * 0.5);
    const selected = capByStok(eligible.slice(0, take), program.stokTotal);
    const rows = selected.map((k) =>
      buildRow(
        program,
        k,
        randomDateInLastDays(60, rng),
        pickStatus({ diterima: 0.85, terjadwal: 0.15 }, rng),
      ),
    );
    await flushProgram(program, rows);
  }

  // PROGRAM 3 — BLT (random 30% all keluarga)
  {
    const program = programs[2];
    const rng = seededRandom(program.id * 1009);
    const pool = keluarga.filter((k) => !isExcluded(k));
    const shuffled = [...pool];
    shuffleInPlace(shuffled, rng);
    const take = Math.floor(pool.length * 0.3);
    const selected = capByStok(shuffled.slice(0, take), program.stokTotal);
    const rows = selected.map((k) =>
      buildRow(
        program,
        k,
        randomDateInLastDays(30, rng),
        pickStatus({ diterima: 0.9, tidak_hadir: 0.1 }, rng),
      ),
    );
    await flushProgram(program, rows);
  }

  // PROGRAM 4 — Sembako (random 60% eligible)
  {
    const program = programs[3];
    const rng = seededRandom(program.id * 1009);
    const eligible = keluarga.filter(
      (k) =>
        !isExcluded(k) &&
        (k.statusEkonomi === StatusEkonomi.sangat_miskin ||
          k.statusEkonomi === StatusEkonomi.miskin ||
          k.statusEkonomi === StatusEkonomi.rentan ||
          k.statusEkonomi === StatusEkonomi.sedang),
    );
    const shuffled = [...eligible];
    shuffleInPlace(shuffled, rng);
    const take = Math.floor(eligible.length * 0.6);
    const selected = capByStok(shuffled.slice(0, take), program.stokTotal);
    const rows = selected.map((k) =>
      buildRow(
        program,
        k,
        randomDateInLastDays(14, rng),
        pickStatus({ diterima: 0.95, tidak_hadir: 0.05 }, rng),
      ),
    );
    await flushProgram(program, rows);
  }

  // ANOMALY 1 — top 10 skor → all 4 programs (exclude uncovered pool)
  const top10 = keluarga.filter((k) => !uncoveredSet.has(k.id)).slice(0, 10);
  let duplicateInjected = 0;
  for (const k of top10) {
    for (const program of programs) {
      const key = pairKey(program.id, k.id);
      if (existingPairs.has(key)) continue;
      existingPairs.add(key);
      const rng = seededRandom(k.id * 17 + program.id);
      penerimaBuffer.push(
        buildRow(
          program,
          k,
          randomDateInLastDays(45, rng),
          DistribusiStatus.diterima,
        ),
      );
      duplicateInjected++;
    }
  }

  if (penerimaBuffer.length > 0) {
    const result = await prisma.bantuanPenerima.createMany({
      data: penerimaBuffer,
      skipDuplicates: true,
    });
    totalInserted += result.count;
    console.log(`[Anomali] Duplicate injection rows attempted: ${penerimaBuffer.length}, inserted: ${result.count}`);
  }

  const totalPenerima = await prisma.bantuanPenerima.count();
  const uniqueRecipients = await prisma.bantuanPenerima.groupBy({
    by: ['keluargaId'],
    where: { keluargaId: { not: null } },
  });

  let uncoveredVerified = 0;
  for (const id of uncoveredSet) {
    const any = await prisma.bantuanPenerima.count({
      where: { keluargaId: id, status: { not: DistribusiStatus.ditolak } },
    });
    if (any === 0) uncoveredVerified++;
  }

  const recipientGroups = await prisma.bantuanPenerima.groupBy({
    by: ['keluargaId'],
    where: { keluargaId: { not: null }, status: { not: DistribusiStatus.ditolak } },
    _count: { id: true },
  });
  const repeatedRecipientCount = recipientGroups.filter((g) => g._count.id > 1).length;

  console.log('\n=== BANTUAN DISTRIBUTION SELESAI ===');
  console.log('Program created/confirmed:', programCount);
  console.log('Total penerima records   :', totalPenerima);
  console.log('New rows this run        :', totalInserted);
  console.log('Keluarga dapat bantuan   :', uniqueRecipients.length);
  console.log('Anomali injected:');
  console.log('  Duplicate recipients   :', repeatedRecipientCount);
  console.log('  High-risk uncovered    :', uncoveredVerified, `(target pool: ${uncoveredSet.size})`);
  console.log('  Top-10 injection rows  :', duplicateInjected);

  console.log('\nNext: Run GET /api/bantuan/fairness to see AI detection results');
  console.log('       POST /api/bantuan/fairness/calculate per RT to persist snapshots + anomalies');
  console.log('Expected anomalies: duplicate recipients + high-risk uncovered');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
