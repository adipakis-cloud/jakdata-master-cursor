import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

/** Mapping: nama kecamatan → singkatan kode */
const KECAMATAN_CODES: Record<string, string> = {
  Cengkareng: 'CEG',
  'Grogol Petamburan': 'GRP',
  Tambora: 'TMB',
  'Taman Sari': 'TMS',
  'Kebon Jeruk': 'KBJ',
  Kembangan: 'KMB',
  Kalideres: 'KLD',
  Palmerah: 'PLM',
  Penjaringan: 'PNJ',
  Pademangan: 'PDM',
  'Tanjung Priok': 'TJP',
  Koja: 'KJA',
  'Kelapa Gading': 'KLG',
  Cilincing: 'CLN',
  'Kepulauan Seribu Utara': 'KSU',
  'Kepulauan Seribu Selatan': 'KSS',
};

const LEVELS = ['KEC', 'KEL', 'RW', 'RT'] as const;
const LEVEL_MAP: Record<(typeof LEVELS)[number], string> = {
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

  console.log('[Setup] Memulai setup kode aktivasi semua Dapil 3...');

  for (const [namaKec, singkatan] of Object.entries(KECAMATAN_CODES)) {
    try {
      const kecamatan = await prisma.kecamatan.findFirst({
        where: {
          nama: { contains: namaKec.split(' ')[0], mode: 'insensitive' },
          kota: { kode: { in: ['3172', '3173', '3101'] } },
        },
        select: { id: true, nama: true },
      });

      if (!kecamatan) {
        console.warn(`[Setup] Kecamatan tidak ditemukan: ${namaKec}`);
        continue;
      }

      for (const suffix of LEVELS) {
        const kode = `${singkatan}-${suffix}-2026`;
        const level = LEVEL_MAP[suffix];
        await prisma.$executeRaw(
          Prisma.sql`INSERT INTO activation_codes (kode, level, kecamatan_id, max_usage, aktif)
                     VALUES (${kode}, ${level}, ${kecamatan.id}, 999, true)
                     ON CONFLICT (kode) DO UPDATE SET aktif = true, kecamatan_id = EXCLUDED.kecamatan_id`,
        );
      }

      console.log(`[Setup] ✓ ${kecamatan.nama} (${singkatan}): 4 kode aktivasi ready`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Setup] ✗ ${namaKec}: ${msg}`);
    }
  }

  console.log('[Setup] ✓ Setup kode aktivasi selesai');
}
