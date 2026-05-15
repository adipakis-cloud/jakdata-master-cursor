/**
 * Pilot seed: ~10 warga per RT, up to 100 RT in Jakarta Utara (kota kode 3172).
 * Keluarga: upsert by noKk. Warga: createMany per RT (skipDuplicates).
 * NIK: no real values — nikHash / nikEncrypted left null.
 */
import { Prisma, PrismaClient, StatusEkonomi } from '@prisma/client';
import { randomUUID } from 'crypto';
import { withPrismaPoolParams } from '../src/config/dbUrl';

const rawDb = process.env.DATABASE_URL;
const prisma = new PrismaClient(
  rawDb
    ? {
        datasources: {
          db: {
            url: withPrismaPoolParams(rawDb, {
              connectionLimit: 1,
              poolTimeoutSec: 120,
              suggestPgBouncer: true,
            }),
          },
        },
      }
    : undefined,
);

const namaDepanMale = [
  'Budi',
  'Agus',
  'Slamet',
  'Wahyu',
  'Hendra',
  'Deni',
  'Rudi',
  'Andi',
  'Joko',
  'Bambang',
  'Eko',
  'Dika',
  'Fajar',
  'Gilang',
  'Rizky',
  'Bayu',
  'Doni',
  'Arif',
  'Sigit',
  'Purnomo',
  'Yusuf',
  'Iwan',
  'Taufik',
  'Haris',
  'Fauzi',
];
const namaDepanFemale = [
  'Siti',
  'Dewi',
  'Ani',
  'Sri',
  'Rina',
  'Yanti',
  'Wati',
  'Indah',
  'Fitri',
  'Nurul',
  'Ratna',
  'Lestari',
  'Ayu',
  'Dian',
  'Maya',
  'Endah',
  'Rini',
  'Suci',
  'Laras',
  'Putri',
  'Tari',
  'Wulan',
  'Nita',
  'Lia',
  'Sari',
];
const namaBelakang = [
  'Santoso',
  'Wijaya',
  'Susanto',
  'Rahayu',
  'Wulandari',
  'Purnama',
  'Kurniawan',
  'Setiawan',
  'Hidayat',
  'Gunawan',
  'Pratama',
  'Saputra',
  'Nugroho',
  'Kusuma',
  'Hartono',
  'Lestari',
  'Utama',
  'Firmansyah',
  'Cahyono',
  'Prabowo',
  'Hakim',
  'Saleh',
  'Fauzan',
  'Basuki',
  'Hendarto',
];
const pekerjaanPool = [
  'Pedagang',
  'Buruh',
  'Karyawan Swasta',
  'Wiraswasta',
  'Ibu Rumah Tangga',
  'Ojek Online',
  'Sopir',
  'Tukang',
  'Petani',
  'Nelayan',
  'Pelajar',
  'Mahasiswa',
  'PNS',
  'TNI/Polri',
  'Pensiunan',
];

const statusRumahOpts = ['milik', 'kontrak', 'menumpang'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function rInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomBirthYearRange(minY: number, maxY: number): Date {
  const y = rInt(minY, maxY);
  const m = rInt(0, 11);
  const d = rInt(1, 28);
  return new Date(y, m, d);
}

function pickStatusEkonomi(): StatusEkonomi {
  const u = Math.random();
  if (u < 0.4) return StatusEkonomi.sedang;
  if (u < 0.65) return StatusEkonomi.rentan;
  if (u < 0.85) return StatusEkonomi.miskin;
  if (u < 0.95) return StatusEkonomi.mampu;
  return StatusEkonomi.sangat_miskin;
}

function bandForStatus(s: StatusEkonomi): { minP: number; maxP: number; minSkor: number; maxSkor: number } {
  switch (s) {
    case StatusEkonomi.sangat_miskin:
      return { minP: 500_000, maxP: 1_000_000, minSkor: 85, maxSkor: 100 };
    case StatusEkonomi.miskin:
      return { minP: 1_000_000, maxP: 2_000_000, minSkor: 65, maxSkor: 85 };
    case StatusEkonomi.rentan:
      return { minP: 2_000_000, maxP: 3_500_000, minSkor: 40, maxSkor: 65 };
    case StatusEkonomi.sedang:
      return { minP: 3_500_000, maxP: 6_000_000, minSkor: 15, maxSkor: 40 };
    case StatusEkonomi.mampu:
    default:
      return { minP: 6_000_000, maxP: 15_000_000, minSkor: 0, maxSkor: 15 };
  }
}

function kategoriBantuanFor(s: StatusEkonomi): string {
  if (s === StatusEkonomi.sangat_miskin || s === StatusEkonomi.miskin) return 'prioritas';
  if (s === StatusEkonomi.rentan) return 'perhatian';
  return 'normal';
}

function fullNameMale(): string {
  return `${pick(namaDepanMale)} ${pick(namaBelakang)}`;
}

function fullNameFemale(): string {
  return `${pick(namaDepanFemale)} ${pick(namaBelakang)}`;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function ageYears(dob: Date): number {
  const t = new Date();
  let a = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) a--;
  return a;
}

function isNonWorkingJob(job: string): boolean {
  return job === 'Ibu Rumah Tangga' || job === 'Pelajar' || job === 'Mahasiswa';
}

function kemampuanFor(dob: Date, job: string): boolean {
  const a = ageYears(dob);
  if (a < 7 || a > 70) return false;
  if (isNonWorkingJob(job)) return false;
  return true;
}

type KelStats = { kecamatanNama: string; kelurahanNama: string; rt: number; keluarga: number; warga: number };
const kelStats = new Map<number, KelStats>();

function bumpKel(
  kelId: number,
  kecamatanNama: string,
  kelurahanNama: string,
  dRt: number,
  dK: number,
  dW: number,
) {
  const cur = kelStats.get(kelId) ?? { kecamatanNama, kelurahanNama, rt: 0, keluarga: 0, warga: 0 };
  cur.rt += dRt;
  cur.keluarga += dK;
  cur.warga += dW;
  cur.kecamatanNama = kecamatanNama;
  cur.kelurahanNama = kelurahanNama;
  kelStats.set(kelId, cur);
}

async function main() {
  const rts = await prisma.rT.findMany({
    where: { rw: { kelurahan: { kecamatan: { kota: { kode: '3172' } } } } },
    take: 100,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      nomor: true,
      rw: {
        select: {
          id: true,
          nomor: true,
          kelurahan: {
            select: {
              id: true,
              nama: true,
              kecamatan: { select: { id: true, nama: true } },
            },
          },
        },
      },
    },
  });

  if (!rts.length) {
    console.error('No RT found for Jakarta Utara (kode 3172). Run prisma/seed-dapil3.ts wilayah first.');
    process.exitCode = 1;
    return;
  }

  let keluargaCount = 0;
  let wargaCount = 0;

  for (const rt of rts) {
    const existingKk = await prisma.keluarga.findMany({
      where: { rtId: rt.id, noKk: { startsWith: `KK-${rt.id}-` } },
      select: { id: true },
    });
    if (existingKk.length) {
      await prisma.warga.deleteMany({ where: { kkId: { in: existingKk.map((k) => k.id) } } });
    }

    const kel = rt.rw.kelurahan;
    const kec = kel.kecamatan;
    const rtNomor = rt.nomor;
    const rwNomor = rt.rw.nomor;
    const kelurahanNama = kel.nama;
    const kecamatanNama = kec.nama;
    const alamatBase = `RT ${rtNomor} RW ${rwNomor} Kel. ${kelurahanNama}`;

    const sizes = [3, 3, 4];
    shuffleInPlace(sizes);

    const wargaBatch: Prisma.WargaCreateManyInput[] = [];

    for (let fi = 0; fi < sizes.length; fi++) {
      const nAnggota = sizes[fi]!;
      const noKk = `KK-${rt.id}-${String(fi + 1).padStart(4, '0')}`;
      const statusEkonomi = pickStatusEkonomi();
      const band = bandForStatus(statusEkonomi);
      const totalPenghasilan = rInt(band.minP, band.maxP);
      const skorPrioritasBantuan = rInt(band.minSkor, band.maxSkor);
      const kategoriBantuan = kategoriBantuanFor(statusEkonomi);
      const namaKepala = fullNameMale();
      const jumlahTanggungan = Math.min(nAnggota - 1, rInt(1, 2));

      const keluarga = await prisma.keluarga.upsert({
        where: { noKk },
        create: {
          rtId: rt.id,
          namaKepala,
          noKk,
          jumlahAnggota: nAnggota,
          jumlahTanggungan,
          statusRumah: pick(statusRumahOpts),
          statusEkonomi,
          totalPenghasilan,
          skorPrioritasBantuan,
          kategoriBantuan,
        },
        update: {
          namaKepala,
          jumlahAnggota: nAnggota,
          jumlahTanggungan,
          statusRumah: pick(statusRumahOpts),
          statusEkonomi,
          totalPenghasilan,
          skorPrioritasBantuan,
          kategoriBantuan,
        },
      });
      keluargaCount++;

      for (let wi = 0; wi < nAnggota; wi++) {
        let nama: string;
        let jk: string;
        let dob: Date;
        let job: string;

        if (wi === 0) {
          nama = namaKepala;
          jk = 'L';
          dob = randomBirthYearRange(1960, 1985);
          job = pick(pekerjaanPool.filter((p) => !['Pelajar', 'Mahasiswa', 'Ibu Rumah Tangga'].includes(p)));
        } else if (wi === 1) {
          nama = fullNameFemale();
          jk = 'P';
          dob = randomBirthYearRange(1965, 1990);
          job = Math.random() < 0.55 ? 'Ibu Rumah Tangga' : pick(pekerjaanPool.filter((p) => p !== 'Pelajar' && p !== 'Mahasiswa'));
        } else {
          jk = Math.random() < 0.5 ? 'L' : 'P';
          nama = jk === 'L' ? fullNameMale() : fullNameFemale();
          dob = randomBirthYearRange(2000, 2020);
          job = pick(['Pelajar', 'Mahasiswa', 'Pelajar', 'Buruh', 'Pedagang']);
        }

        const nonWork = isNonWorkingJob(job);
        let penghasilanEst = 0;
        if (!nonWork) {
          if (wi === 0) penghasilanEst = Math.round(totalPenghasilan * (0.48 + Math.random() * 0.22));
          else if (wi === 1) penghasilanEst = Math.round(totalPenghasilan * (0.15 + Math.random() * 0.25));
          else penghasilanEst = Math.round(totalPenghasilan * (0.05 + Math.random() * 0.1));
        }

        wargaBatch.push({
          uuid: randomUUID(),
          rtId: rt.id,
          kkId: keluarga.id,
          nama,
          nikHash: null,
          nikEncrypted: null,
          jenisKelamin: jk,
          tanggalLahir: dob,
          pekerjaan: job,
          penghasilanEst,
          statusEkonomi,
          kemampuanKerja: kemampuanFor(dob, job),
          kategori: 'warga_biasa',
          diverifikasi: false,
          alamat: alamatBase,
        });
      }
    }

    const res = await prisma.warga.createMany({ data: wargaBatch, skipDuplicates: true });
    wargaCount += res.count;

    bumpKel(kel.id, kecamatanNama, kelurahanNama, 1, 3, res.count);
  }

  const sorted = [...kelStats.entries()].sort((a, b) =>
    a[1].kelurahanNama.localeCompare(b[1].kelurahanNama, 'id'),
  );
  for (const [, v] of sorted) {
    console.log(`[${v.kecamatanNama}/${v.kelurahanNama}] RT count: ${v.rt}, Keluarga: ${v.keluarga}, Warga: ${v.warga}`);
  }

  console.log('=== SEED WARGA DAPIL 3 DONE ===');
  console.log('Total RT seeded:', rts.length);
  console.log('Total Keluarga:', keluargaCount);
  console.log('Total Warga:', wargaCount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
