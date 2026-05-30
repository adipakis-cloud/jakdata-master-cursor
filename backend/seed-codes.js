const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function setup() {
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS activation_codes (
      id SERIAL PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      level VARCHAR(20) NOT NULL,
      kecamatan_id INTEGER,
      max_usage INTEGER DEFAULT 999,
      used_count INTEGER DEFAULT 0,
      aktif BOOLEAN DEFAULT true,
      expired_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER
    )
  `);
  console.log('Tabel created');

  const codes = [
    { kode: 'KLD-KEC-2026', level: 'kecamatan' },
    { kode: 'KLD-KEL-2026', level: 'kelurahan' },
    { kode: 'KLD-RW-2026',  level: 'rw' },
    { kode: 'KLD-RT-2026',  level: 'rt' },
  ];

  for (const c of codes) {
    await p.$executeRawUnsafe(`
      INSERT INTO activation_codes (kode, level, kecamatan_id, max_usage, aktif)
      VALUES ('${c.kode}', '${c.level}', 50, 999, true)
      ON CONFLICT (kode) DO NOTHING
    `);
    console.log('Seeded:', c.kode);
  }
  console.log('Done - Kalideres activation codes ready');
}

setup().catch(console.error).finally(() => p.$disconnect().then(() => process.exit(0)));
