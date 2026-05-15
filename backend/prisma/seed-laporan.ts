/**
 * Seed 60 days of operational LaporanWarga from koordinator / petugas lapangan.
 * No schema changes — createMany + skipDuplicates on unique kodeLaporan.
 */
import {
  Prisma,
  PrismaClient,
  ReportStatus,
  UrgencyLevel,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const LAPORAN_TEMPLATES = [
  {
    kategori: 'infrastruktur',
    subkategori: 'jalan',
    templates: [
      'Jalan berlubang di depan gang masuk RT, sudah 2 minggu tidak diperbaiki',
      'Aspal jalan utama mengelupas dan membahayakan pengendara motor',
      'Got air tersumbat menyebabkan genangan air saat hujan',
      'Lampu jalan mati sejak seminggu lalu, warga takut keluar malam hari',
      'Jembatan kecil menuju pemukiman retak dan bergoyang saat dilalui',
    ],
  },
  {
    kategori: 'infrastruktur',
    subkategori: 'air_bersih',
    templates: [
      'Air PAM tidak mengalir sejak 3 hari lalu, warga kesulitan mendapat air bersih',
      'Pipa air bocor di jalan utama, air terbuang sia-sia setiap hari',
      'Kualitas air keruh dan berbau, warga khawatir dampak kesehatan',
    ],
  },
  {
    kategori: 'sosial',
    subkategori: 'bantuan',
    templates: [
      'Lansia sebatang kara tidak mendapat bantuan sembako bulan ini',
      'Keluarga pra-sejahtera tidak terdaftar BPNT padahal memenuhi syarat',
      'Bantuan tidak merata, beberapa KK mendapat lebih dari sekali dalam periode pendek',
      'Warga baru pindah belum terdaftar di data kelurahan, tidak bisa akses layanan',
    ],
  },
  {
    kategori: 'sosial',
    subkategori: 'konflik',
    templates: [
      'Perselisihan antar warga mengenai batas tanah, berlangsung 1 bulan lebih',
      'Keributan di warung setiap malam mengganggu ketertiban umum',
    ],
  },
  {
    kategori: 'kesehatan',
    subkategori: 'lingkungan',
    templates: [
      'Tumpukan sampah tidak diambil 5 hari, mulai menimbulkan bau tidak sedap',
      'Genangan air di depan rumah warga menjadi sarang nyamuk, potensi DBD',
      'Wabah diare menyerang beberapa keluarga di RT ini dalam sebulan terakhir',
    ],
  },
  {
    kategori: 'kesehatan',
    subkategori: 'warga_sakit',
    templates: [
      'Warga lansia membutuhkan bantuan akses layanan kesehatan di puskesmas',
      'Balita terindikasi gizi buruk ditemukan dalam pendataan mingguan',
      'Warga TB belum mendapat pengobatan rutin dari puskesmas setempat',
    ],
  },
  {
    kategori: 'keamanan',
    subkategori: 'kriminalitas',
    templates: [
      'Pencurian kendaraan terjadi di area parkir RW pada malam hari',
      'Penjualan minuman keras ilegal di salah satu warung',
      'Premanisme di akses masuk pemukiman mulai meresahkan warga',
    ],
  },
  {
    kategori: 'ekonomi',
    subkategori: 'umkm',
    templates: [
      'PKL kehilangan tempat berjualan akibat penertiban mendadak tanpa sosialisasi',
      'Harga bahan pokok di pasar lokal naik signifikan dalam minggu ini',
      'Warga membutuhkan akses modal usaha untuk UMKM skala kecil',
    ],
  },
  {
    kategori: 'lingkungan',
    subkategori: 'banjir',
    templates: [
      'Banjir setinggi lutut menggenangi 5 rumah warga saat hujan deras kemarin',
      'Drainase tidak berfungsi, air tidak surut 2 jam setelah hujan berhenti',
      'Tanggul kecil di tepi kali mulai tergerus, perlu penguatan segera',
    ],
  },
] as const;

type Reporter = {
  id: number;
  role: UserRole;
  rtId: number | null;
  rwId: number | null;
  kelurahanId: number | null;
  kecamatanId: number | null;
};

type WilayahTarget = {
  rtId: number | null;
  kelurahanId: number | null;
  kecamatanId: number | null;
};

function randomFrom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randomDate(daysAgo: number, rng: () => number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(rng() * daysAgo));
  d.setHours(Math.floor(rng() * 14) + 7, Math.floor(rng() * 60), 0, 0);
  return d;
}

function getUrgency(rng: () => number): UrgencyLevel {
  const r = rng();
  if (r < 0.05) return UrgencyLevel.critical;
  if (r < 0.2) return UrgencyLevel.high;
  if (r < 0.7) return UrgencyLevel.medium;
  return UrgencyLevel.low;
}

function getStatus(createdAt: Date, rng: () => number): ReportStatus {
  const daysOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld < 7) {
    const r = rng();
    if (r < 0.4) return ReportStatus.baru;
    if (r < 0.75) return ReportStatus.diproses;
    if (r < 0.85) return ReportStatus.menunggu_data;
    return ReportStatus.selesai;
  }
  const r = rng();
  if (r < 0.1) return ReportStatus.baru;
  if (r < 0.25) return ReportStatus.diproses;
  if (r < 0.3) return ReportStatus.eskalasi;
  if (r < 0.35) return ReportStatus.menunggu_data;
  if (r < 0.9) return ReportStatus.selesai;
  return ReportStatus.ditolak;
}

function getChannel(rng: () => number): string {
  const r = rng();
  if (r < 0.6) return 'aplikasi';
  if (r < 0.85) return 'whatsapp';
  if (r < 0.95) return 'langsung';
  return 'telepon';
}

function generateKodeLaporan(seq: number): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `LP${yy}${mm}${String(seq).padStart(5, '0')}`;
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

async function loadRtWilayah(rtId: number): Promise<WilayahTarget> {
  const rt = await prisma.rT.findUnique({
    where: { id: rtId },
    select: { id: true, rw: { select: { kelurahanId: true, kelurahan: { select: { kecamatanId: true } } } } },
  });
  if (!rt) return { rtId, kelurahanId: null, kecamatanId: null };
  return {
    rtId: rt.id,
    kelurahanId: rt.rw.kelurahanId,
    kecamatanId: rt.rw.kelurahan.kecamatanId,
  };
}

async function buildReporterContext(reporters: Reporter[]) {
  const rtIdsByRw = new Map<number, number[]>();
  const wilayahCache = new Map<number, WilayahTarget>();

  async function rtIdsForRw(rwId: number): Promise<number[]> {
    let list = rtIdsByRw.get(rwId);
    if (!list) {
      const rows = await prisma.rT.findMany({ where: { rwId }, select: { id: true } });
      list = rows.map((r) => r.id);
      rtIdsByRw.set(rwId, list);
    }
    return list;
  }

  async function resolveWilayah(reporter: Reporter, rng: () => number): Promise<WilayahTarget> {
    let targetRtId: number | null = reporter.rtId;

    if (!targetRtId && reporter.rwId) {
      const rts = await rtIdsForRw(reporter.rwId);
      if (rts.length > 0) targetRtId = rts[Math.floor(rng() * rts.length)];
    }

    if (targetRtId) {
      let cached = wilayahCache.get(targetRtId);
      if (!cached) {
        cached = await loadRtWilayah(targetRtId);
        wilayahCache.set(targetRtId, cached);
      }
      return cached;
    }

    return {
      rtId: null,
      kelurahanId: reporter.kelurahanId,
      kecamatanId: reporter.kecamatanId,
    };
  }

  return { resolveWilayah };
}

async function main() {
  console.log('Seeding laporan warga...');

  const existingCount = await prisma.laporanWarga.count();
  console.log(`Existing laporan in DB: ${existingCount}`);

  const koordinator = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.koordinator_rt, UserRole.koordinator_rw, UserRole.petugas_lapangan] },
      aktif: true,
    },
    select: {
      id: true,
      role: true,
      rtId: true,
      rwId: true,
      kelurahanId: true,
      kecamatanId: true,
    },
  });

  console.log(`Koordinator available: ${koordinator.length}`);

  const rngPick = seededRandom(2026_0515);
  const activeReporters = koordinator
    .filter(() => rngPick() < 0.6)
    .slice(0, 200);

  console.log(`Active reporters: ${activeReporters.length}`);

  const { resolveWilayah } = await buildReporterContext(activeReporters as Reporter[]);

  const laporanRows: Prisma.LaporanWargaCreateManyInput[] = [];
  let seq = existingCount + 1;

  for (const reporter of activeReporters) {
    const rng = seededRandom(reporter.id * 7919);
    const reportCount = 1 + Math.floor(rng() * 4);

    for (let r = 0; r < reportCount; r++) {
      const template = randomFrom(LAPORAN_TEMPLATES, rng);
      const isi = randomFrom(template.templates, rng);
      const createdAt = randomDate(60, rng);
      const urgency = getUrgency(rng);
      const status = getStatus(createdAt, rng);
      const channel = getChannel(rng);
      const wilayah = await resolveWilayah(reporter as Reporter, rng);

      const resolvedAt =
        status === ReportStatus.selesai
          ? new Date(createdAt.getTime() + Math.floor(rng() * 14 * 24 * 60 * 60 * 1000))
          : null;

      const slaDeadline =
        urgency === UrgencyLevel.critical
          ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
          : urgency === UrgencyLevel.high
            ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)
            : null;

      laporanRows.push({
        kodeLaporan: generateKodeLaporan(seq++),
        channelType: channel,
        namaPelapor: null,
        noHpPelapor: null,
        isiLaporan: isi,
        kategori: template.kategori,
        subkategori: template.subkategori,
        urgencyLevel: urgency,
        lokasiText: wilayah.rtId ? `RT area, wilayah koordinator` : `RW area, wilayah koordinator`,
        rtId: wilayah.rtId,
        kelurahanId: wilayah.kelurahanId,
        kecamatanId: wilayah.kecamatanId,
        isEmergency: urgency === UrgencyLevel.critical,
        status,
        aiSummary: null,
        aiRecommendation: null,
        lampiranUrls: [],
        assignedTo: null,
        slaDeadline,
        resolvedAt,
        createdBy: reporter.id,
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
      });
    }
  }

  console.log(`Preparing ${laporanRows.length} laporan...`);

  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < laporanRows.length; i += CHUNK) {
    const chunk = laporanRows.slice(i, i + CHUNK);
    const result = await prisma.laporanWarga.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += result.count;
    process.stdout.write('.');
  }

  const byKategori = await prisma.laporanWarga.groupBy({
    by: ['kategori'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const byStatus = await prisma.laporanWarga.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const byUrgency = await prisma.laporanWarga.groupBy({
    by: ['urgencyLevel'],
    _count: { id: true },
  });

  console.log('\n=== SEED LAPORAN SELESAI ===');
  console.log('Total inserted    :', inserted);
  console.log('By kategori       :', JSON.stringify(Object.fromEntries(byKategori.map((k) => [k.kategori, k._count.id]))));
  console.log('By status         :', JSON.stringify(Object.fromEntries(byStatus.map((s) => [s.status, s._count.id]))));
  console.log('By urgency        :', JSON.stringify(Object.fromEntries(byUrgency.map((u) => [u.urgencyLevel, u._count.id]))));
  console.log(
    'Critical laporan  :',
    byUrgency.find((u) => u.urgencyLevel === UrgencyLevel.critical)?._count.id ?? 0,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
