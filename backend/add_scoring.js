const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$executeRawUnsafe(`
  ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS kinerja_skor INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kinerja_bintang INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kinerja_level VARCHAR(20) DEFAULT 'baru',
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_warga_input INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_laporan_input INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hari_aktif INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skor_updated_at TIMESTAMPTZ
`).then(() => console.log('Kolom scoring berhasil ditambahkan'))
  .catch(e => console.error('Error:', e.message))
  .finally(() => p.$disconnect().then(() => process.exit(0)));
