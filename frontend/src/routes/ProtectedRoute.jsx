import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, initializing, hasRole, user } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles) && !user?.is_superuser) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
