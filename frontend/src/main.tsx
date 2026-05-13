import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { useAuth } from './store/auth.store';
import { LoginPage } from './pages/LoginPage';
import { AdminApp } from './pages/admin/AdminApp';
import { FieldApp } from './pages/field/FieldApp';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin_pusat') return <Navigate to="/field" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin_pusat' ? <Navigate to="/admin" replace /> : <Navigate to="/field" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/*" element={<ProtectedRoute adminOnly><AdminApp /></ProtectedRoute>} />
        <Route path="/field/*" element={<ProtectedRoute><FieldApp /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
