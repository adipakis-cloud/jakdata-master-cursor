import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { useAuth } from './store/auth.store';
import { defaultHomePath } from './lib/routePolicy';
import {
  APP_MODE,
  COMMAND_ROLES,
  FIELD_SHELL_ROLES,
  WARMINDO_ROLES,
  defaultPathForMode,
  isRoleAllowedInMode,
} from './lib/appMode';
import { LoginPage } from './pages/LoginPage';
import { AdminApp } from './pages/admin/AdminApp';
import { FieldApp } from './pages/field/FieldApp';
import { WarmindoApp } from './pages/warmindo/WarmindoApp';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import WrongApp from './pages/WrongApp';
import { ProtectedRoute } from './router/ProtectedRoute';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isRoleAllowedInMode(user.role)) return <Navigate to="/wrong-app" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isRoleAllowedInMode(user.role)) return <Navigate to="/wrong-app" replace />;
  if (APP_MODE === 'command') return <Navigate to="/admin/home" replace />;
  return <Navigate to={defaultHomePath(user.role)} replace />;
}

function CommandRoutes() {
  return (
    <>
      <Route path="/command/*" element={<Navigate to="/admin/home" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/home" replace />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={[...COMMAND_ROLES]}>
            <AdminApp />
          </ProtectedRoute>
        }
      />
      <Route path="/field/*" element={<Navigate to="/wrong-app" replace />} />
      <Route path="/warmindo/*" element={<Navigate to="/wrong-app" replace />} />
    </>
  );
}

function FieldRoutes() {
  return (
    <>
      <Route
        path="/field/*"
        element={
          <ProtectedRoute allowedRoles={[...FIELD_SHELL_ROLES]}>
            <FieldApp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warmindo/*"
        element={
          <ProtectedRoute allowedRoles={[...WARMINDO_ROLES]}>
            <WarmindoApp />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/*" element={<Navigate to="/wrong-app" replace />} />
      <Route path="/command/*" element={<Navigate to="/wrong-app" replace />} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/wrong-app" element={<WrongApp />} />
        {APP_MODE === 'command' ? CommandRoutes() : FieldRoutes()}
        <Route
          path="/unauthorized"
          element={
            <RequireAuth>
              <UnauthorizedPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to={defaultPathForMode()} replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
