import bcrypt from 'bcryptjs';

export const DEFAULT_SEED_PASSWORD = 'admin123';
export const BCRYPT_ROUNDS = 10;

export function validateNewPassword(
  currentPlain: string,
  newPlain: string,
  confirmPlain: string,
): string | null {
  if (newPlain.length < 8) return 'Password baru minimal 8 karakter';
  if (newPlain !== confirmPlain) return 'Konfirmasi password tidak cocok';
  if (newPlain === currentPlain) return 'Password baru tidak boleh sama dengan password lama';
  return null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function isDefaultPasswordHash(passwordHash: string): Promise<boolean> {
  return bcrypt.compare(DEFAULT_SEED_PASSWORD, passwordHash);
}

export async function isDefaultPasswordUser(user: {
  lastLoginAt: Date | null;
  passwordHash: string;
}): Promise<boolean> {
  if (user.lastLoginAt == null) return true;
  return isDefaultPasswordHash(user.passwordHash);
}

export function buildWilayahUserFilter(role: string, wilayahId: number): Record<string, number> {
  switch (role) {
    case 'koordinator_rt':
    case 'petugas_lapangan':
      return { rtId: wilayahId };
    case 'koordinator_rw':
      return { rwId: wilayahId };
    case 'koordinator_kelurahan':
      return { kelurahanId: wilayahId };
    case 'koordinator_kecamatan':
      return { kecamatanId: wilayahId };
    case 'manager_warmindo':
    case 'kasir_warmindo':
      return { warmindoId: wilayahId };
    case 'admin_kota':
      return { kotaId: wilayahId };
    case 'admin_kecamatan':
      return { kecamatanId: wilayahId };
    case 'admin_kelurahan':
      return { kelurahanId: wilayahId };
    default:
      return {};
  }
}
