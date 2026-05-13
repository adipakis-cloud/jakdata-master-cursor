import { create } from 'zustand';

interface User { id:number; nama:string; email:string; role:string; rtId?:number; rwId?:number; kelurahanId?:number; kecamatanId?:number; }

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isField: () => boolean;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: (() => { try { return JSON.parse(localStorage.getItem('jakdata_user') ?? 'null'); } catch { return null; } })(),
  token: localStorage.getItem('jakdata_token'),
  login: (user, token) => { localStorage.setItem('jakdata_token', token); localStorage.setItem('jakdata_user', JSON.stringify(user)); set({ user, token }); },
  logout: () => { localStorage.removeItem('jakdata_token'); localStorage.removeItem('jakdata_user'); set({ user: null, token: null }); },
  isAdmin: () => get().user?.role === 'admin_pusat',
  isField: () => ['petugas_lapangan','koordinator_rt','koordinator_rw'].includes(get().user?.role ?? ''),
}));
