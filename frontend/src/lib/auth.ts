import { isRoleAllowedInMode } from './appMode';

/** Canonical shape persisted under `jakdata_user`. */
export type StoredAuthUser = {
  id: number;
  nama: string;
  email: string;
  role: string;
  wilayahId: number | null;
  wilayahType: string | null;
  kotaId?: number | null;
  kecamatanId?: number | null;
  kelurahanId?: number | null;
  rwId?: number | null;
  rtId?: number | null;
  warmindoId?: number | null;
};

export function normalizeStoredUser(raw: Record<string, unknown>): StoredAuthUser {
  return {
    id: Number(raw.id),
    nama: String(raw.nama ?? ''),
    email: String(raw.email ?? ''),
    role: String(raw.role ?? ''),
    wilayahId: raw.wilayahId != null && raw.wilayahId !== '' ? Number(raw.wilayahId) : null,
    wilayahType: raw.wilayahType != null ? String(raw.wilayahType) : null,
    kotaId: raw.kotaId != null ? Number(raw.kotaId) : undefined,
    kecamatanId: raw.kecamatanId != null ? Number(raw.kecamatanId) : undefined,
    kelurahanId: raw.kelurahanId != null ? Number(raw.kelurahanId) : undefined,
    rwId: raw.rwId != null ? Number(raw.rwId) : undefined,
    rtId: raw.rtId != null ? Number(raw.rtId) : undefined,
    warmindoId: raw.warmindoId != null ? Number(raw.warmindoId) : undefined,
  };
}

export const AuthStorage = {
  save(token: string, user: StoredAuthUser) {
    localStorage.setItem('jakdata_token', token);
    localStorage.setItem('jakdata_user', JSON.stringify(user));
  },

  getToken(): string | null {
    return localStorage.getItem('jakdata_token');
  },

  getUser(): StoredAuthUser | null {
    const raw = localStorage.getItem('jakdata_user');
    if (!raw) return null;
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      return normalizeStoredUser(o);
    } catch {
      return null;
    }
  },

  clear() {
    localStorage.removeItem('jakdata_token');
    localStorage.removeItem('jakdata_user');
    localStorage.removeItem('jakdata_role');
    localStorage.removeItem('jakdata_wilayah_id');
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem('jakdata_token');
  },
};

/** After login: persist session only if role matches this build's app mode. */
export function saveSessionIfRoleAllowed(token: string, user: StoredAuthUser): boolean {
  if (!isRoleAllowedInMode(user.role)) {
    AuthStorage.clear();
    return false;
  }
  AuthStorage.save(token, user);
  return true;
}

export function redirectToWrongApp(): void {
  AuthStorage.clear();
  window.location.href = '/wrong-app';
}
