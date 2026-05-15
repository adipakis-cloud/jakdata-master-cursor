import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { useAuth } from './store/auth.store';
import { defaultHomePath } from './lib/routePolicy';
import { LoginPage } from './pages/LoginPage';
import { AdminApp } from './pages/admin/AdminApp';
import { FieldApp } from './pages/field/FieldApp';
import { WarmindoApp } from './pages/warmindo/WarmindoApp';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { ProtectedRoute } from './router/ProtectedRoute';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Prisma `UserRole` strings — must match `ProtectedRoute` / `AuthStorage` user.role */
const ADMIN_APP_ROLES = [
  'admin_pusat',
  'admin_kota',
  'admin_kecamatan',
  'admin_kelurahan',
  'auditor',
  'finance_admin',
] as const;

const FIELD_APP_ROLES = [
  'koordinator_kecamatan',
  'koordinator_kelurahan',
  'koordinator_rw',
  'koordinator_rt',
  'petugas_lapangan',
] as const;

const WARMINDO_APP_ROLES = ['manager_warmindo', 'kasir_warmindo'] as const;

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={defaultHomePath(user.role)} replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/command/*" element={<Navigate to="/admin/home" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/home" replace />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={[...ADMIN_APP_ROLES]}>
              <AdminApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/field/*"
          element={
            <ProtectedRoute allowedRoles={[...FIELD_APP_ROLES]}>
              <FieldApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warmindo/*"
          element={
            <ProtectedRoute allowedRoles={[...WARMINDO_APP_ROLES]}>
              <WarmindoApp />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<RequireAuth><UnauthorizedPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
