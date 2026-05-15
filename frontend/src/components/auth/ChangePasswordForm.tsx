import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { AuthStorage } from '../../lib/auth';
import { useAuth } from '../../store/auth.store';

type Strength = { label: string; color: string };

function passwordStrength(pw: string): Strength {
  if (pw.length < 8) return { label: 'Terlalu pendek', color: '#dc2626' };
  if (!/\d/.test(pw)) return { label: 'Cukup', color: '#ca8a04' };
  return { label: 'Kuat', color: '#16a34a' };
}

type Props = {
  showDefaultWarning?: boolean;
  onPasswordChanged?: () => void;
};

export function ChangePasswordForm({ showDefaultWarning = false, onPasswordChanged }: Props) {
  const nav = useNavigate();
  const { logout, setIsDefaultPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);
  const confirmOk = confirmPassword.length > 0 && newPassword === confirmPassword;
  const confirmBad = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      setIsDefaultPassword(false);
      onPasswordChanged?.();
      setTimeout(() => {
        AuthStorage.clear();
        logout();
        nav('/login', { replace: true, state: { message: 'Silakan login ulang dengan password baru' } });
      }, 3000);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error ?? 'Gagal mengubah password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="password" className="space-y-4 scroll-mt-4">
      <h3 className="text-sm font-bold text-gray-900">🔐 Keamanan Akun</h3>

      {showDefaultWarning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="block font-semibold">⚠️ Password Default</span>
          <span className="mt-1 block">
            Anda masih menggunakan password default. Segera ganti password untuk keamanan akun Anda.
          </span>
        </p>
      ) : null}

      {success ? (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
          ✅ Password berhasil diubah! Silakan login ulang dengan password baru…
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="card space-y-3 p-4">
        <label className="block">
          <span className="label">Password Saat Ini</span>
          <input
            type="password"
            className="input mt-1 min-h-[44px] w-full"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="block">
          <span className="label">Password Baru</span>
          <input
            type="password"
            className="input mt-1 min-h-[44px] w-full"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          {newPassword.length > 0 ? (
            <span className="mt-1 block text-xs font-medium" style={{ color: strength.color }}>
              {strength.label}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="label">Konfirmasi Password Baru</span>
          <input
            type="password"
            className="input mt-1 min-h-[44px] w-full"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          {confirmOk ? <span className="mt-1 block text-xs font-medium text-green-600">✅ Password cocok</span> : null}
          {confirmBad ? <span className="mt-1 block text-xs font-medium text-red-600">❌ Tidak cocok</span> : null}
        </label>
        <button
          type="submit"
          className="btn-primary w-full justify-center py-3 text-base"
          style={{ minHeight: 48 }}
          disabled={saving || success}
        >
          {saving ? 'Menyimpan…' : 'Ganti Password'}
        </button>
      </form>
    </section>
  );
}
