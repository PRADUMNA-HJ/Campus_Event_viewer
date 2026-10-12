import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LockIcon, DashboardIcon, LogOutIcon, PlusIcon, UsersIcon } from './Icons';

/**
 * Responsive role-aware navigation bar.
 * Supports public visitors, regular students (ROLE_USER), coordinators (ROLE_COORDINATOR),
 * and administrators (ROLE_MAIN_ADMIN).
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, logout, isMainAdmin, isCoordinator, isUser } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getDashboardPath = () => {
    if (isCoordinator) return '/coordinator/dashboard';
    if (isMainAdmin) return '/admin/dashboard';
    return '/coordinator/status';
  };

  const getRoleLabel = () => {
    if (isMainAdmin) return 'ADMIN';
    if (isCoordinator) return 'COORDINATOR';
    return 'USER';
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="main-nav">
        <div className="container navbar__inner">
          <Link to="/" className="navbar__logo" id="nav-logo">
            <span className="navbar__logo-icon">CP</span>
            <span className="gradient-text">CampusPulse</span>
          </Link>

          <div className="navbar__links" id="nav-links">
            <Link
              to="/"
              className={`navbar__link ${isActive('/') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/coordinator') ? 'navbar__link--active' : ''}`}
              id="nav-link-events"
            >
              Events
            </Link>
            <Link
              to="/about"
              className={`navbar__link ${isActive('/about') ? 'navbar__link--active' : ''}`}
              id="nav-link-about"
            >
              About
            </Link>

            {isAuthenticated ? (
              <div className="navbar__admin-group">
                {/* Regular User specific links */}
                {isUser && (
                  <>
                    <Link
                      to="/coordinator/request"
                      className={`navbar__link ${isActive('/coordinator/request') ? 'navbar__link--active' : ''}`}
                      id="nav-link-coord-request"
                    >
                      <UsersIcon size={15} />
                      <span>Request Coordinator</span>
                    </Link>
                    <Link
                      to="/coordinator/status"
                      className={`navbar__link ${isActive('/coordinator/status') ? 'navbar__link--active' : ''}`}
                      id="nav-link-dashboard"
                    >
                      <span>Application Status</span>
                    </Link>
                  </>
                )}

                {/* Coordinator specific links */}
                {isCoordinator && (
                  <>
                    <Link
                      to="/coordinator/dashboard"
                      className={`navbar__link navbar__link--admin ${isActive('/coordinator/dashboard') ? 'navbar__link--active' : ''}`}
                      id="nav-link-dashboard"
                    >
                      <DashboardIcon size={15} />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/coordinator/events/new"
                      className="navbar__link"
                      id="nav-link-new-event"
                    >
                      <PlusIcon size={15} />
                      <span>New Event</span>
                    </Link>
                  </>
                )}

                {/* Main Admin specific links */}
                {isMainAdmin && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={`navbar__link navbar__link--admin ${isActive('/admin') ? 'navbar__link--active' : ''}`}
                      id="nav-link-dashboard"
                    >
                      <DashboardIcon size={15} />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/admin/events/new"
                      className="navbar__link"
                      id="nav-link-admin-new-event"
                    >
                      <PlusIcon size={15} />
                      <span>New Event</span>
                    </Link>
                  </>
                )}

                {/* User Pill & Role Badge */}
                <div className="navbar__user-pill" title={`${user?.email} (${getRoleLabel()})`}>
                  <span className="user-dot"></span>
                  <span className="user-email">
                    {user?.email ? user.email.split('@')[0] : 'User'}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      background: isMainAdmin
                        ? 'var(--accent-cyan-dim)'
                        : isCoordinator
                        ? 'var(--accent-purple-dim)'
                        : 'rgba(255,255,255,0.08)',
                      color: isMainAdmin
                        ? 'var(--accent-cyan)'
                        : isCoordinator
                        ? 'var(--accent-purple)'
                        : 'var(--text-secondary)',
                      fontWeight: 600,
                      marginLeft: '4px',
                    }}
                  >
                    {getRoleLabel()}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={logout}
                  className="navbar__logout-btn"
                  id="nav-logout-btn"
                  title="Sign out of session"
                  aria-label="Logout"
                >
                  <LogOutIcon size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Link
                  to="/register"
                  className={`navbar__link ${isActive('/register') ? 'navbar__link--active' : ''}`}
                  id="nav-link-register"
                >
                  <span>Register</span>
                </Link>
                <Link
                  to="/admin/login"
                  className={`navbar__link navbar__link--login ${isActive('/admin/login') || isActive('/login') ? 'navbar__link--active' : ''}`}
                  id="nav-link-admin-login"
                >
                  <LockIcon size={14} />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>

          <button
            className="navbar__mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            id="nav-mobile-toggle"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      <div className={`navbar__mobile-menu ${mobileOpen ? 'open' : ''}`} id="nav-mobile-menu">
        <Link
          to="/"
          className={`navbar__mobile-link ${isActive('/') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/coordinator') ? 'navbar__mobile-link--active' : ''}`}
        >
          Events
        </Link>
        <Link
          to="/about"
          className={`navbar__mobile-link ${isActive('/about') ? 'navbar__mobile-link--active' : ''}`}
        >
          About
        </Link>

        {isAuthenticated ? (
          <>
            <Link
              to={getDashboardPath()}
              className="navbar__mobile-link navbar__mobile-link--admin"
            >
              <DashboardIcon size={16} />
              <span>{isMainAdmin ? 'Admin Dashboard' : isCoordinator ? 'Coordinator Dashboard' : 'My Application'}</span>
            </Link>

            {isUser && (
              <Link to="/coordinator/request" className="navbar__mobile-link">
                <UsersIcon size={16} />
                <span>Request Coordinator Access</span>
              </Link>
            )}

            {(isCoordinator || isMainAdmin) && (
              <Link to={isMainAdmin ? '/admin/events/new' : '/coordinator/events/new'} className="navbar__mobile-link">
                <PlusIcon size={16} />
                <span>Create New Event</span>
              </Link>
            )}

            <div className="navbar__mobile-user">
              <span>
                Signed in as: <strong>{user?.email || 'user@campus.edu'}</strong> ({getRoleLabel()})
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="navbar__mobile-logout"
            >
              <LogOutIcon size={16} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/register" className="navbar__mobile-link">
              <span>Register Student Account</span>
            </Link>
            <Link
              to="/admin/login"
              className={`navbar__mobile-link ${isActive('/admin/login') || isActive('/login') ? 'navbar__mobile-link--active' : ''}`}
            >
              <LockIcon size={16} />
              <span>Sign In</span>
            </Link>
          </>
        )}
      </div>
    </>
  );
}
