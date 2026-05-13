import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth.store';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.user, data.token);
      nav(data.user.role === 'admin_pusat' ? '/admin' : '/field', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login gagal. Periksa email dan password.');
    } finally { setLoading(false); }
  }

  const demoAccounts = [
    { label: '👑 Admin Pusat', email: 'admin@jakdata.id', pass: 'admin123', color: 'blue' },
    { label: '📋 Petugas RT', email: 'petugas.rt001@jakdata.id', pass: 'petugas123', color: 'green' },
    { label: '🏘️ Koordinator RW', email: 'kordin.rw001@jakdata.id', pass: 'petugas123', color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <span className="text-3xl">🗺️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">JAKDATA</h1>
          <p className="text-blue-200 text-sm mt-1">Sistem Data Wilayah Jakarta</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="email@jakdata.id" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2 border border-red-100">{error}</p>}
            <button className="btn-primary w-full justify-center py-3 text-base" disabled={loading}>
              {loading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3 font-semibold uppercase tracking-wide">Demo Akun</p>
            <div className="space-y-2">
              {demoAccounts.map(a => (
                <button key={a.email} type="button" onClick={() => { setEmail(a.email); setPassword(a.pass); }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm flex justify-between items-center transition-colors">
                  <span className="font-medium text-gray-700">{a.label}</span>
                  <span className="text-gray-400 text-xs font-mono">{a.email.split('@')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
