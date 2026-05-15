import { create } from 'zustand';
import { api } from '../lib/api';
import { AuthStorage, normalizeStoredUser, type StoredAuthUser } from '../lib/auth';
import { prismaRoleToAccessRole } from '../lib/accessRoles';
import { includesFieldRole, includesWarmindoRole } from '../lib/routePolicy';

export type User = StoredAuthUser;

interface AuthStore {
  user: User | null;
  token: string | null;
  isDefaultPassword: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setIsDefaultPassword: (value: boolean) => void;
  refreshPasswordStatus: () => Promise<void>;
  isAdmin: () => boolean;
  isField: () => boolean;
  isWarmindo: () => boolean;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: AuthStorage.getUser(),
  token: AuthStorage.getToken(),
  isDefaultPassword: localStorage.getItem('jakdata_default_password') === '1',
  login: (user: User, token: string) => {
    const stored = normalizeStoredUser(user as unknown as Record<string, unknown>);
    AuthStorage.save(token, stored);
    localStorage.setItem('jakdata_role', prismaRoleToAccessRole(stored.role));
    localStorage.setItem('jakdata_wilayah_id', stored.wilayahId != null ? String(stored.wilayahId) : '');
    set({ user: stored, token });
  },
  logout: () => {
    AuthStorage.clear();
    localStorage.removeItem('jakdata_default_password');
    set({ user: null, token: null, isDefaultPassword: false });
  },
  setIsDefaultPassword: (value: boolean) => {
    if (value) localStorage.setItem('jakdata_default_password', '1');
    else localStorage.removeItem('jakdata_default_password');
    set({ isDefaultPassword: value });
  },
  refreshPasswordStatus: async () => {
    if (!AuthStorage.getToken()) {
      set({ isDefaultPassword: false });
      return;
    }
    try {
      const { data } = await api.get<{ isDefaultPassword: boolean }>('/auth/password-status');
      get().setIsDefaultPassword(Boolean(data.isDefaultPassword));
    } catch {
      set({ isDefaultPassword: false });
    }
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
