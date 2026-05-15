import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';

export function WarmindoProfil() {
  const { user, logout, isDefaultPassword, refreshPasswordStatus } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    refreshPasswordStatus();
  }, [refreshPasswordStatus]);

  useEffect(() => {
    if (location.hash === '#password') {
      document.getElementById('password')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  return (
    <section className="space-y-4 p-4">
      <header className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs text-stone-500">Nama</p>
        <p className="text-base font-bold text-stone-900">{user?.nama}</p>
        <p className="mt-3 text-xs text-stone-500">Email</p>
        <p className="text-sm text-stone-800">{user?.email}</p>
        <p className="mt-3 text-xs text-stone-500">Peran</p>
        <p className="text-sm text-stone-800">{user?.role}</p>
      </header>

      <ChangePasswordForm showDefaultWarning={isDefaultPassword} onPasswordChanged={refreshPasswordStatus} />

      <button
        type="button"
        className="w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-700"
        onClick={() => {
          logout();
          nav('/login', { replace: true });
        }}
      >
        Keluar
      </button>
    </section>
  );
}
