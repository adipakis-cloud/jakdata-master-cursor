import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export type ActivationCodeRow = {
  id: number;
  kode: string;
  level: string;
  wilayah_id: number | null;
  kecamatan_id: number | null;
  max_usage: number;
  used_count: number;
  aktif: boolean;
  expired_at: Date | null;
};

const LEVEL_ROLE: Record<string, string> = {
  kecamatan: 'koordinator_kecamatan',
  kelurahan: 'koordinator_kelurahan',
  rw: 'koordinator_rw',
  rt: 'koordinator_rt',
};

export function roleFromActivationLevel(level: string): string | null {
  return LEVEL_ROLE[level] ?? null;
}

export function levelLabel(level: string): string {
  const labels: Record<string, string> = {
    kecamatan: 'Kecamatan',
    kelurahan: 'Kelurahan',
    rw: 'RW',
    rt: 'RT',
  };
  return labels[level] ?? level;
}

export async function findActivationCode(kode: string): Promise<ActivationCodeRow | null> {
  const rows = await prisma.$queryRaw<ActivationCodeRow[]>(
    Prisma.sql`SELECT id, kode, level, wilayah_id, kecamatan_id, max_usage, used_count, aktif, expired_at
               FROM activation_codes WHERE kode = ${kode.trim()} AND aktif = true LIMIT 1`,
  );
  return rows[0] ?? null;
}

export function validateActivationCodeRow(
  code: ActivationCodeRow,
): { ok: true } | { ok: false; reason: string } {
  if (code.expired_at && code.expired_at < new Date()) {
    return { ok: false, reason: 'Kode aktivasi sudah kedaluwarsa' };
  }
  if (code.used_count >= code.max_usage) {
    return { ok: false, reason: 'Kode aktivasi sudah mencapai batas penggunaan' };
  }
  if (!LEVEL_ROLE[code.level]) {
    return { ok: false, reason: 'Level kode tidak dikenali' };
  }
  return { ok: true };
}

export async function incrementActivationCodeUsage(kode: string): Promise<void> {
  await prisma.$executeRaw(
    Prisma.sql`UPDATE activation_codes SET used_count = used_count + 1 WHERE kode = ${kode.trim()}`,
  );
}

export function normalizeNoHp(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  let s = raw.replace(/\s+/g, '').trim();
  if (s.startsWith('+62')) s = '0' + s.slice(3);
  if (s.startsWith('62') && s.length >= 11) s = '0' + s.slice(2);

  if (!/^08\d{8,11}$/.test(s)) {
    return { ok: false, error: 'Format nomor HP tidak valid (gunakan 08xxxxxxxxxx)' };
  }
  return { ok: true, value: s };
}
