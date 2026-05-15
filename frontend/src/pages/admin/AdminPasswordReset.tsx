import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';

const RESET_ROLES = [
  { value: 'koordinator_rt', label: 'Koordinator RT' },
  { value: 'koordinator_rw', label: 'Koordinator RW' },
  { value: 'koordinator_kelurahan', label: 'Koordinator Kelurahan' },
  { value: 'koordinator_kecamatan', label: 'Koordinator Kecamatan' },
  { value: 'petugas_lapangan', label: 'Petugas Lapangan' },
  { value: 'manager_warmindo', label: 'Manager Warmindo' },
] as const;

export function AdminPasswordReset() {
  const [role, setRole] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [bulkPassword, setBulkPassword] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const [userQuery, setUserQuery] = useState('');
  const [singlePassword, setSinglePassword] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState('');

  const roleLabel = RESET_ROLES.find((r) => r.value === role)?.label ?? role;

  async function submitBulk(e: FormEvent) {
    e.preventDefault();
    if (!bulkConfirm) {
      setBulkConfirm(true);
      return;
    }
    setBulkLoading(true);
    setBulkResult('');
    try {
      const body: Record<string, unknown> = { role, newPassword: bulkPassword };
      if (wilayahId.trim()) body.wilayahId = Number(wilayahId);
      const { data } = await api.post('/admin/users/reset-password', body);
      setBulkResult(`✅ ${data.count} akun berhasil direset`);
      setBulkConfirm(false);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setBulkResult(ax.response?.data?.error ?? 'Gagal reset password');
      setBulkConfirm(false);
    } finally {
      setBulkLoading(false);
    }
  }

  async function submitSingle(e: FormEvent) {
    e.preventDefault();
    setSingleLoading(true);
    setSingleResult('');
    try {
      const q = userQuery.trim();
      const body: Record<string, unknown> = { newPassword: singlePassword };
      if (/^\d+$/.test(q)) body.userId = Number(q);
      else body.email = q;
      const { data } = await api.post('/admin/users/reset-password', body);
      setSingleResult(data.count > 0 ? `✅ ${data.message}` : 'Tidak ada akun yang cocok');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setSingleResult(ax.response?.data?.error ?? 'Gagal reset password');
    } finally {
      setSingleLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-xl font-bold text-gray-900">🔐 Reset Password Koordinator</h1>
        <p className="mt-1 text-sm text-gray-600">Admin pusat — reset massal atau per akun</p>
      </header>

      <form onSubmit={submitBulk} className="card space-y-4 p-5">
        <h2 className="text-sm font-bold text-gray-800">SECTION 1 — Reset per role</h2>
        <label className="block">
          <span className="label">Pilih role</span>
          <select className="input mt-1 w-full" value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Pilih role…</option>
            {RESET_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Wilayah ID (opsional)</span>
          <input
            className="input mt-1 w-full"
            type="number"
            placeholder="ID RT/RW/Kel/Kec"
            value={wilayahId}
            onChange={(e) => setWilayahId(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Password baru</span>
          <input
            type="password"
            className="input mt-1 w-full min-h-[44px]"
            value={bulkPassword}
            onChange={(e) => setBulkPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {bulkConfirm && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Yakin reset password semua akun <strong>{roleLabel}</strong>
            {wilayahId.trim() ? ` di wilayah ${wilayahId}` : ''}?
          </p>
        )}
        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={bulkLoading}>
          {bulkLoading ? 'Memproses…' : bulkConfirm ? 'Ya, Reset Sekarang' : `Reset Semua ${roleLabel || 'Role'} Ini`}
        </button>
        {bulkResult ? <p className="text-sm font-medium text-gray-800">{bulkResult}</p> : null}
      </form>

      <form onSubmit={submitSingle} className="card space-y-4 p-5">
        <h2 className="text-sm font-bold text-gray-800">SECTION 2 — Reset akun spesifik</h2>
        <label className="block">
          <span className="label">Email atau ID user</span>
          <input
            className="input mt-1 w-full"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="email@jakdata.id atau 42"
            required
          />
        </label>
        <label className="block">
          <span className="label">Password baru</span>
          <input
            type="password"
            className="input mt-1 w-full min-h-[44px]"
            value={singlePassword}
            onChange={(e) => setSinglePassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={singleLoading}>
          {singleLoading ? 'Memproses…' : 'Reset Password Akun Ini'}
        </button>
        {singleResult ? <p className="text-sm font-medium text-gray-800">{singleResult}</p> : null}
      </form>

      <aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-semibold">SECTION 3 — Panduan Password Lapangan</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Koordinator RT: format RTxxx-[nomor RT] contoh: RT001-Kapuk</li>
          <li>Koordinator Kelurahan: nama kelurahan + tahun</li>
          <li>Semua password minimal 8 karakter</li>
          <li>Bagikan password via WA langsung ke koordinator</li>
        </ul>
      </aside>
    </section>
  );
}
