import { Navigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SpinnerIcon, AlertCircleIcon, ArrowLeftIcon } from './Icons';

/**
 * Route protection wrapper for role-based views.
 * 
 * Supports:
 * - Unauthenticated redirection to appropriate login screen
 * - Role-based authorization verification (allowedRoles prop)
 * - Clear Access Denied screen for authenticated users lacking privileges
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="admin-loading" id="admin-auth-loading">
        <div className="admin-loading__spinner">
          <SpinnerIcon size={32} />
        </div>
        <p className="admin-loading__text">Verifying authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve test compatibility: redirect to /admin/login for /admin routes, otherwise /login
    const loginTarget = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return <Navigate to={loginTarget} state={{ from: location }} replace />;
  }

  // Check role restrictions if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;
    // Map ADMIN to MAIN_ADMIN for backward compatibility
    const hasRole = allowedRoles.some((role) => {
      if (role === 'MAIN_ADMIN' && userRole === 'ADMIN') return true;
      if (role === 'ADMIN' && userRole === 'MAIN_ADMIN') return true;
      return role === userRole;
    });

    if (!hasRole) {
      return (
        <div className="container" style={{ padding: 'var(--space-16) 0' }}>
          <div className="alert alert--danger" role="alert" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <AlertCircleIcon size={32} style={{ margin: '0 auto var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              Your account (<strong>{user?.email}</strong>) has role <strong>{user?.role}</strong> which does not have permission to access this page.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <Link to="/" className="btn btn--secondary btn--sm">
                <ArrowLeftIcon size={14} /> Back to Events
              </Link>
              {user?.role === 'USER' && (
                <Link to="/coordinator/request" className="btn btn--primary btn--sm">
                  Request Coordinator Access
                </Link>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  return children ? children : <Outlet />;
}
