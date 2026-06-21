import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { getDefaultRoute, hasPermission, type Permission } from '../permissions';

export default function RoleRoute({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!hasPermission(user, permission)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  return <>{children}</>;
}
