import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';

export function WarmindoProfil() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
        <p className="text-xs text-stone-500">Nama</p>
        <p className="text-base font-bold text-stone-900">{user?.nama}</p>
        <p className="text-xs text-stone-500 mt-3">Email</p>
        <p className="text-sm text-stone-800">{user?.email}</p>
        <p className="text-xs text-stone-500 mt-3">Peran</p>
        <p className="text-sm text-stone-800">{user?.role}</p>
      </div>
      <button
        type="button"
        className="w-full py-3 rounded-xl border border-red-200 text-red-700 font-semibold text-sm"
        onClick={() => {
          logout();
          nav('/login', { replace: true });
        }}
      >
        Keluar
      </button>
    </div>
  );
}
