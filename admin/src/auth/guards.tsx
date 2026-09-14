import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccess, type AdminRoute } from '../lib/roles';
import { Loader2 } from 'lucide-react';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground text-[12.5px] text-muted">
        <Loader2 className="mr-2 size-4 animate-spin text-plum" />
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function RequireRoute({ route, children }: { route: AdminRoute; children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[12.5px] text-muted">
        <Loader2 className="mr-2 size-4 animate-spin text-plum" />
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!canAccess(session.role, route)) return <Navigate to="/access-denied" replace />;
  return children;
}
