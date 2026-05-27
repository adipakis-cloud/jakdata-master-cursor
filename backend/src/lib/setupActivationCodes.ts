import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

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

  const kalideres = await prisma.kecamatan.findFirst({
    where: { nama: { equals: 'Kalideres', mode: 'insensitive' } },
    select: { id: true },
  });
  const kecamatanId = kalideres?.id ?? 50;

  const codes = [
    { kode: 'KLD-KEC-2026', level: 'kecamatan' },
    { kode: 'KLD-KEL-2026', level: 'kelurahan' },
    { kode: 'KLD-RW-2026', level: 'rw' },
    { kode: 'KLD-RT-2026', level: 'rt' },
  ];

  for (const c of codes) {
    await prisma.$executeRaw(
      Prisma.sql`INSERT INTO activation_codes (kode, level, kecamatan_id, max_usage, aktif)
                 VALUES (${c.kode}, ${c.level}, ${kecamatanId}, 999, true)
                 ON CONFLICT (kode) DO NOTHING`,
    );
  }

  console.log(`[Setup] Activation codes ready for Kalideres pilot (kecamatanId=${kecamatanId})`);
}
