import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SpinnerIcon } from './Icons';

/**
 * Route protection wrapper for administrator views.
 * 
 * Note: Route protection in the client is purely a user-experience feature
 * to guide unauthenticated users to the login screen.
 * The Spring Boot backend's Spring Security filter chain is the authoritative
 * security boundary enforcing role-based permissions.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="admin-loading" id="admin-auth-loading">
        <div className="admin-loading__spinner">
          <SpinnerIcon size={32} />
        </div>
        <p className="admin-loading__text">Verifying administrator session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
