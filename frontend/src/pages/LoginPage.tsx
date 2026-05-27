import { useState, FormEvent, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AuthStorage } from '../lib/auth';
import { APP_MODE, COMMAND_ROLES, defaultPathForMode, isRoleAllowedInMode } from '../lib/appMode';
import { useAuth } from '../store/auth.store';

const ALL_OPERATIONAL_ACCOUNTS = [
  { label: 'Admin Pusat', email: 'admin@jakdata.id', pass: 'admin123', roles: COMMAND_ROLES },
  { label: 'Koordinator Kecamatan', email: 'koordinator.kecamatan@jakdata.id', pass: 'admin123', roles: ['koordinator_kecamatan'] },
  { label: 'Koordinator Kelurahan', email: 'koordinator.kelurahan@jakdata.id', pass: 'admin123', roles: ['koordinator_kelurahan'] },
  { label: 'Koordinator RW', email: 'koordinator.rw@jakdata.id', pass: 'admin123', roles: ['koordinator_rw'] },
  { label: 'Koordinator RT', email: 'koordinator.rt@jakdata.id', pass: 'admin123', roles: ['koordinator_rt'] },
  { label: 'Petugas Lapangan', email: 'petugas@jakdata.id', pass: 'admin123', roles: ['petugas_lapangan'] },
  { label: 'Operator Warmindo', email: 'warmindo@jakdata.id', pass: 'admin123', roles: ['manager_warmindo', 'kasir_warmindo'] },
] as const;

const isCommand = APP_MODE === 'command';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, refreshPasswordStatus } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const flashMessage = (location.state as { message?: string } | null)?.message;

  const operationalAccounts = useMemo(
    () =>
      ALL_OPERATIONAL_ACCOUNTS.filter((a) =>
        a.roles.some((r) => isRoleAllowedInMode(r)),
      ),
    [],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });

      if (!isRoleAllowedInMode(data.user.role)) {
        AuthStorage.clear();
        nav('/wrong-app', { replace: true });
        return;
      }

      login(data.user, data.token);
      await refreshPasswordStatus();

      const dest =
        typeof data.redirectTo === 'string' && data.redirectTo
          ? data.redirectTo
          : defaultPathForMode();
      nav(dest, { replace: true });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error ?? 'Login gagal. Periksa email dan password.');
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = isCommand
    ? {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
      }
    : undefined;

  const pageClass = isCommand
    ? 'min-h-screen flex items-center justify-center p-4'
    : 'min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4';

  return (
    <div className={pageClass} style={pageStyle}>
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 backdrop-blur"
            style={{
              background: isCommand ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.1)',
            }}
          >
            <span className="text-3xl">{isCommand ? '🏛️' : '🗺️'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isCommand ? 'JAKDATA Command Center' : 'JAKDATA'}
          </h1>
          <p className={`mt-1 text-sm ${isCommand ? 'text-amber-200/90' : 'text-blue-200'}`}>
            {isCommand ? 'Sistem Intelijen Territorial Dapil 3' : 'Sistem Data Wilayah Jakarta'}
          </p>
          {isCommand ? (
            <p className="mt-2 text-xs font-medium tracking-wide text-amber-300/80">DPR RI · Dapil Jakarta III</p>
          ) : null}
        </header>

        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          {flashMessage ? (
            <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">{flashMessage}</p>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="email@jakdata.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error ? (
              <p className="rounded-lg border border-red-100 bg-red-50 p-2 text-sm text-red-600">{error}</p>
            ) : null}
            <button
              className="btn-primary w-full justify-center py-3 text-base"
              style={isCommand ? { backgroundColor: '#1e3a8a' } : undefined}
              disabled={loading}
            >
              {loading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>

          {operationalAccounts.length > 0 ? (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                Akun Operasional
              </p>
              <p className="mb-3 text-center text-[11px] text-gray-500">
                Data awal sistem — gunakan hanya di lingkungan terkontrol.
              </p>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {operationalAccounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.pass);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-700">{a.label}</span>
                    <span className="font-mono text-xs text-gray-400">{a.email.split('@')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-5 text-center text-sm text-gray-500">
            Belum punya akun?{' '}
            <Link to="/daftar" className="font-medium text-blue-600 hover:underline">
              Daftar koordinator di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
