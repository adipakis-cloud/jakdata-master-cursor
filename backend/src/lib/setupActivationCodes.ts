import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { DAPIL3_KOTA_KODES } from './dapil3';

/** Kecamatan Dapil 3 — singkatan kode aktivasi */
const DAPIL3_KECAMATAN_CODES: { nama: string; singkat: string; kotaKode: string }[] = [
  { nama: 'Cengkareng', singkat: 'CEG', kotaKode: '3173' },
  { nama: 'Grogol Petamburan', singkat: 'GRP', kotaKode: '3173' },
  { nama: 'Tambora', singkat: 'TMB', kotaKode: '3173' },
  { nama: 'Taman Sari', singkat: 'TMS', kotaKode: '3173' },
  { nama: 'Kebon Jeruk', singkat: 'KBJ', kotaKode: '3173' },
  { nama: 'Kembangan', singkat: 'KMB', kotaKode: '3173' },
  { nama: 'Kalideres', singkat: 'KLD', kotaKode: '3173' },
  { nama: 'Palmerah', singkat: 'PLM', kotaKode: '3173' },
  { nama: 'Penjaringan', singkat: 'PNJ', kotaKode: '3172' },
  { nama: 'Pademangan', singkat: 'PDM', kotaKode: '3172' },
  { nama: 'Tanjung Priok', singkat: 'TJP', kotaKode: '3172' },
  { nama: 'Koja', singkat: 'KJA', kotaKode: '3172' },
  { nama: 'Kelapa Gading', singkat: 'KLG', kotaKode: '3172' },
  { nama: 'Cilincing', singkat: 'CLN', kotaKode: '3172' },
  { nama: 'Kepulauan Seribu Utara', singkat: 'KSU', kotaKode: '3101' },
  { nama: 'Kepulauan Seribu Selatan', singkat: 'KSS', kotaKode: '3101' },
];

const LEVEL_SUFFIX = ['KEC', 'KEL', 'RW', 'RT'] as const;
const LEVEL_MAP: Record<string, string> = {
  KEC: 'kecamatan',
  KEL: 'kelurahan',
  RW: 'rw',
  RT: 'rt',
};

export async function setupActivationCodes(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS activation_codes (
      id SERIAL PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      level VARCHAR(20) NOT NULL,
      wilayah_id INTEGER,
      kecamatan_id INTEGER,
      max_usage INTEGER DEFAULT 999,
      used_count INTEGER DEFAULT 0,
      aktif BOOLEAN DEFAULT true,
      expired_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER
    )
  `);

  let okCount = 0;
  for (const spec of DAPIL3_KECAMATAN_CODES) {
    try {
      const kec = await prisma.kecamatan.findFirst({
        where: {
          nama: { equals: spec.nama, mode: 'insensitive' },
          kota: { kode: spec.kotaKode },
        },
        select: { id: true, nama: true },
      });

      if (!kec) {
        console.warn(`[JAKDATA][Setup] Kode aktivasi ${spec.nama}: SKIP (tidak ditemukan)`);
        continue;
      }

      for (const suffix of LEVEL_SUFFIX) {
        const kode = `${spec.singkat}-${suffix}-2026`;
        const level = LEVEL_MAP[suffix];
        await prisma.$executeRaw(
          Prisma.sql`INSERT INTO activation_codes (kode, level, kecamatan_id, max_usage, aktif)
                     VALUES (${kode}, ${level}, ${kec.id}, 999, true)
                     ON CONFLICT (kode) DO NOTHING`,
        );
      }

      okCount += 1;
      console.log(`[JAKDATA][Setup] Kode aktivasi ${kec.nama}: OK`);
    } catch (err) {
      console.warn(`[JAKDATA][Setup] Kode aktivasi ${spec.nama}: SKIP`, (err as Error).message);
    }
  }

  console.log(
    `[JAKDATA][Setup] Activation codes Dapil 3 — ${okCount}/${DAPIL3_KECAMATAN_CODES.length} kecamatan (kota: ${DAPIL3_KOTA_KODES.join(', ')})`,
  );
}
