import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';
import { defaultHomePath } from '../../lib/routePolicy';

function profilPath(role: string | undefined): string {
  const home = defaultHomePath(role ?? '');
  if (home.startsWith('/field')) return '/field/profil#password';
  if (home.startsWith('/warmindo')) return '/warmindo/profil#password';
  if (home.startsWith('/admin')) return '/admin/home';
  return '/field/profil#password';
}

export function DefaultPasswordBanner() {
  const { isDefaultPassword, user } = useAuth();
  const location = useLocation();

  if (!isDefaultPassword) return null;
  if (location.pathname.includes('/profil')) return null;

  const href = profilPath(user?.role);

  return (
    <p
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
      role="status"
    >
      ⚠️ Anda masih menggunakan password default.{' '}
      <Link to={href} className="font-semibold underline">
        Ganti Sekarang →
      </Link>
    </p>
  );
}
