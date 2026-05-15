import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';
import { WilayahBadge } from '../../components/field/WilayahBadge';

type Props = {
  children: ReactNode;
  rtInfo?: { nomor?: string; rw?: { nomor?: string; kelurahan?: { nama?: string } } } | null;
};

const tabs: { to: string; label: string; icon: string }[] = [
  { to: '/field/laporan', label: 'Laporan', icon: '📋' },
  { to: '/field/warga', label: 'Warga', icon: '👥' },
  { to: '/field/bantuan', label: 'Bantuan', icon: '🎁' },
  { to: '/field/wilayah', label: 'Wilayah', icon: '🗺️' },
  { to: '/field/profil', label: 'Profil', icon: '👤' },
];

export function FieldLayout({ children, rtInfo }: Props) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen max-w-md mx-auto bg-gray-50" style={{ paddingBottom: 70 }}>
      <div className="flex items-center justify-between bg-blue-700 px-4 py-2.5 text-white">
        <span className="text-sm font-bold">JAKDATA Lapangan</span>
        <span className="text-xs text-blue-100">{user?.nama?.split(' ')[0] ?? ''}</span>
      </div>

      <div className="px-4 pt-3">
        <WilayahBadge rtInfo={rtInfo} />
      </div>

      <div className="px-4 py-3">{children}</div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 mx-auto flex max-w-md justify-around bg-white"
        style={{ height: 60, borderTop: '1px solid #e5e7eb' }}
      >
        {tabs.map((t) => {
          const active =
            t.to === '/field/laporan'
              ? pathname.startsWith('/field/laporan')
              : t.to === '/field/warga'
                ? pathname.startsWith('/field/warga')
                : pathname === t.to || pathname.startsWith(`${t.to}/`);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 no-underline"
              style={{
                fontSize: '11px',
                fontWeight: active ? 600 : 400,
                color: active ? '#2563eb' : '#6b7280',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
