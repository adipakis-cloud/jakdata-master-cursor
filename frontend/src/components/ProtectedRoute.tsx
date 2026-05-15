import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthStorage } from '../lib/auth';
import { isRoleAllowedInMode } from '../lib/appMode';
import { useAuth } from '../store/auth.store';
import { DefaultPasswordBanner } from './auth/DefaultPasswordBanner';
import { AccessDenied } from '../pages/AccessDenied';

type Props = {
  allowedRoles: string[];
  children: ReactNode;
};

/** Role guard: `allowedRoles` must list Prisma `UserRole` strings (e.g. `admin_pusat`). */
export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const token = AuthStorage.getToken();
  const user = AuthStorage.getUser();
  const { refreshPasswordStatus } = useAuth();

  useEffect(() => {
    if (token && user) void refreshPasswordStatus();
  }, [token, user?.id, refreshPasswordStatus]);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isRoleAllowedInMode(user.role)) {
    return <Navigate to="/wrong-app" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return (
    <>
      <DefaultPasswordBanner />
      {children}
    </>
  );
}
