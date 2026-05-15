import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.store';

export function AccessDenied() {
  const nav = useNavigate();
  const logout = useAuth((s) => s.logout);
  const goLogin = () => {
    logout();
    nav('/login', { replace: true });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
        <p className="text-4xl">⛔</p>
        <h1 className="text-lg font-bold text-gray-900">Akses ditolak</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Akses tidak sesuai peran Anda. Silakan login dengan akun yang benar.
        </p>
        <button type="button" className="btn-primary w-full justify-center py-3" onClick={goLogin}>
          Kembali ke Login
        </button>
      </div>
    </div>
  );
}
