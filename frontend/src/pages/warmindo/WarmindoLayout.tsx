import { NavLink, Outlet, useLocation } from 'react-router-dom';

const BRAND = '#16a34a';
const MUTED = '#6b7280';

const TABS = [
  { to: '/warmindo/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/warmindo/transaksi', label: 'Transaksi', icon: '🧾' },
  { to: '/warmindo/inventory', label: 'Stok', icon: '📦' },
  { to: '/warmindo/keuangan', label: 'Keuangan', icon: '💰' },
  { to: '/warmindo/profil', label: 'Profil', icon: '👤' },
] as const;

export function WarmindoLayout() {
  const loc = useLocation();
  return (
    <div
      className="min-h-screen bg-stone-100 flex flex-col mx-auto overflow-x-hidden"
      style={{ maxWidth: 375, width: '100%' }}
    >
      <div className="flex-1 pb-20">
        <Outlet />
      </div>
      <nav
        className="fixed bottom-0 left-0 right-0 mx-auto flex border-t border-stone-200 bg-white z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        style={{ maxWidth: 375, width: '100%' }}
      >
        {TABS.map((t) => {
          const active =
            t.to === '/warmindo/transaksi'
              ? loc.pathname.startsWith('/warmindo/transaksi')
              : loc.pathname === t.to || loc.pathname.startsWith(`${t.to}/`);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to !== '/warmindo/transaksi'}
              className="flex-1 flex flex-col items-center py-2 text-[10px] font-semibold no-underline"
              style={{ color: active ? BRAND : MUTED }}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="mt-0.5">{t.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
