import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccess, type AdminRoute } from '../lib/roles';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function RequireRoute({ route, children }: { route: AdminRoute; children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!canAccess(session.role, route)) return <Navigate to="/access-denied" replace />;
  return children;
}
