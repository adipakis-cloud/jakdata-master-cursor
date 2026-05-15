import { create } from 'zustand';
import { AuthStorage, normalizeStoredUser, type StoredAuthUser } from '../lib/auth';
import { prismaRoleToAccessRole } from '../lib/accessRoles';
import { includesFieldRole, includesWarmindoRole } from '../lib/routePolicy';

export type User = StoredAuthUser;

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isField: () => boolean;
  isWarmindo: () => boolean;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: AuthStorage.getUser(),
  token: AuthStorage.getToken(),
  login: (user: User, token: string) => {
    const stored = normalizeStoredUser(user as unknown as Record<string, unknown>);
    AuthStorage.save(token, stored);
    localStorage.setItem('jakdata_role', prismaRoleToAccessRole(stored.role));
    localStorage.setItem('jakdata_wilayah_id', stored.wilayahId != null ? String(stored.wilayahId) : '');
    set({ user: stored, token });
  },
  logout: () => {
    AuthStorage.clear();
    set({ user: null, token: null });
  },
  isAdmin: () => {
    const r = get().user?.role;
    return (
      r === 'admin_pusat' ||
      r === 'admin_kota' ||
      r === 'admin_kecamatan' ||
      r === 'admin_kelurahan' ||
      r === 'auditor' ||
      r === 'finance_admin'
    );
  },
  isField: () => includesFieldRole(get().user?.role),
  isWarmindo: () => includesWarmindoRole(get().user?.role),
}));
