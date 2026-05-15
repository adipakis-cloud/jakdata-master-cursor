import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthStorage } from '../lib/auth';
import { AccessDenied } from '../pages/AccessDenied';

type Props = {
  allowedRoles: string[];
  children: ReactNode;
};

/** Role guard: `allowedRoles` must list Prisma `UserRole` strings (e.g. `admin_pusat`). */
export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const token = AuthStorage.getToken();
  const user = AuthStorage.getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
