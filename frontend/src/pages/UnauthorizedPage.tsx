import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.store';
import { defaultHomePath } from '../lib/routePolicy';

export function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const role = user?.role ?? '';
  const dest = defaultHomePath(role);
  const canGoElsewhere = dest !== '/unauthorized';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full bg-white/10 rounded-2xl p-8 border border-white/20 text-center space-y-4">
        <p className="text-4xl">⛔</p>
        <h1 className="text-xl font-bold">Akses tidak diizinkan</h1>
        <p className="text-sm text-slate-200 leading-relaxed">
          Akun Anda (<span className="font-mono text-amber-200">{role || '—'}</span>) tidak memiliki akses ke halaman ini.
          Silakan buka dashboard yang sesuai peran, atau hubungi administrator.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          {user && canGoElsewhere && (
            <button
              type="button"
              className="btn-primary w-full justify-center py-3"
              onClick={() => nav(dest, { replace: true })}
            >
              Ke dashboard saya
            </button>
          )}
          <button
            type="button"
            className="btn-secondary w-full justify-center py-3"
            onClick={() => {
              logout();
              nav('/login', { replace: true });
            }}
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
