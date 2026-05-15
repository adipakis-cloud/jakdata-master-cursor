import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthStorage } from '../../lib/auth';
import { useAuth } from '../../store/auth.store';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';

type Props = {
  onLogout: () => void;
};

export function FieldProfil({ onLogout }: Props) {
  const u = AuthStorage.getUser();
  const { isDefaultPassword, refreshPasswordStatus } = useAuth();
  const location = useLocation();

  const initials = useMemo(() => {
    const n = (u?.nama ?? '?').trim();
    const p = n.split(/\s+/).filter(Boolean);
    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase() || '?';
  }, [u?.nama]);

  const roleLabel = (u?.role ?? '').replace(/_/g, ' ');

  useEffect(() => {
    refreshPasswordStatus();
  }, [refreshPasswordStatus]);

  useEffect(() => {
    if (location.hash === '#password') {
      document.getElementById('password')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col items-center text-center">
        <span
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: '#2563eb' }}
        >
          {initials}
        </span>
        <p className="text-[18px] font-semibold text-gray-900">{u?.nama}</p>
        <p className="text-sm text-gray-600">{u?.email}</p>
        <p className="mt-1 text-sm capitalize text-gray-500">{roleLabel}</p>
        <p className="mt-2 text-xs text-gray-500">
          Wilayah: RT {u?.rtId ?? '—'} / RW {u?.rwId ?? '—'} / Kel. {u?.kelurahanId ?? '—'}
        </p>
      </header>

      <ChangePasswordForm showDefaultWarning={isDefaultPassword} onPasswordChanged={refreshPasswordStatus} />

      <button
        type="button"
        className="w-full rounded-lg py-3 text-sm font-semibold"
        style={{ border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'white', minHeight: 44 }}
        onClick={onLogout}
      >
        Keluar dari Akun
      </button>
      <p className="text-center text-[12px] text-[#9ca3af]">JAKDATA Field v0.1</p>
    </section>
  );
}
