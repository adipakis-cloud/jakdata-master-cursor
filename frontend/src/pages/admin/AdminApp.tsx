import { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';
import { AdminDashboard } from './AdminDashboard';
import AdminHome from './AdminHome';
import { AdminWarga, AdminLaporan, AdminWarmindo, AdminBantuan, AdminAI, AdminWilayah } from './AdminPages';
import { AdminKoordinator } from './AdminKoordinator';

const NAV = [
  { path: 'home', label: 'Beranda', icon: '🏠' },
  { path: 'dashboard', label: 'Command Center', icon: '📊' },
  { path: 'wilayah', label: 'Wilayah', icon: '🗺️' },
  { path: 'laporan', label: 'Laporan', icon: '📋' },
  { path: 'bantuan', label: 'Bantuan', icon: '🎁' },
  { path: 'warmindo', label: 'Warmindo', icon: '🍜' },
  { path: 'ai', label: 'AI Alerts', icon: '🤖' },
  { path: 'koordinator', label: 'Governance', icon: '🏛️' },
];

export function AdminApp() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {open && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-56 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ background: 'linear-gradient(180deg,#0D2D5E 0%,#1A4FA0 100%)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: 'rgba(200,150,12,0.2)' }}>
              🗺️
            </div>
            <div>
              <div className="text-white font-bold text-sm">JAKDATA</div>
              <div className="text-xs" style={{ color: '#C8960C' }}>
                Command Center
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              to={`/admin/${item.path}`}
              end={item.path === 'home'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'text-yellow-300' : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(200,150,12,0.15)', border: '1px solid rgba(200,150,12,0.3)' }
                  : { border: '1px solid transparent' }
              }
              onClick={() => setOpen(false)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: '#C8960C', color: '#0D2D5E' }}
            >
              {user?.nama?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.nama}</div>
              <div className="text-xs truncate" style={{ color: '#93C5FD' }}>
                {user?.role?.replace(/_/g, ' ')}
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                nav('/login', { replace: true });
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93C5FD', fontSize: 14 }}
            >
              ✕
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 border-none bg-white cursor-pointer text-lg" onClick={() => setOpen(!open)}>
            ☰
          </button>
          <span className="text-sm text-gray-500 hidden sm:block">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              logout();
              nav('/login', { replace: true });
            }}
            className="btn-secondary btn-sm"
          >
            Keluar
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Routes>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<AdminHome />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="wilayah" element={<AdminWilayah />} />
            <Route path="koordinator" element={<AdminKoordinator />} />
            <Route path="warga" element={<AdminWarga />} />
            <Route path="laporan" element={<AdminLaporan />} />
            <Route path="bantuan" element={<AdminBantuan />} />
            <Route path="warmindo" element={<AdminWarmindo />} />
            <Route path="ai" element={<AdminAI />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
