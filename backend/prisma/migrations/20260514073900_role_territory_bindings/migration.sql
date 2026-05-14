-- Add role values used by seeded territorial admin accounts.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin_kota';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin_kecamatan';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin_kelurahan';

-- Bind city-level administrators to a kota.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kota_id" INTEGER;

CREATE INDEX IF NOT EXISTS "users_kota_id_idx" ON "users"("kota_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_kota_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_kota_id_fkey"
      FOREIGN KEY ("kota_id") REFERENCES "kota"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
