import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LockIcon, DashboardIcon, LogOutIcon, PlusIcon, UsersIcon, ExternalLinkIcon } from './Icons';

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
  const toggleBtnRef = useRef(null);

  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleMobileLogout = useCallback(() => {
    setMobileOpen(false);
    logout();
  }, [logout]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileOpen(false);
  }

  // Close on Escape key press and restore focus to toggle button
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Close when resized past mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background scroll when mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

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
          <Link to={isAdminRoute ? '/admin/dashboard' : '/'} className="navbar__logo" id="nav-logo" onClick={closeMobile}>
            <span className="navbar__logo-icon">CP</span>
            <span className="gradient-text">CampusPulse</span>
            {isAdminRoute && (
              <span className="badge badge--admin" style={{ marginLeft: '6px', fontSize: '10px' }}>
                ADMIN CONTROL
              </span>
            )}
          </Link>

          {isAdminRoute && isAuthenticated && isMainAdmin ? (
            /* Dedicated Single Admin Header Links */
            <div className="navbar__links" id="nav-links">
              <Link
                to="/"
                className="navbar__link"
                id="nav-link-public-site"
                title="View Public Campus Directory"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLinkIcon size={14} />
                <span>Public Site</span>
              </Link>

              <Link
                to="/admin/events/new"
                className="btn btn--primary btn--sm"
                id="nav-link-admin-new-event"
              >
                <PlusIcon size={15} />
                <span>Create Event</span>
              </Link>

              <Link
                to="/admin/dashboard"
                className={`navbar__link navbar__link--admin ${isActive('/admin') ? 'navbar__link--active' : ''}`}
                id="nav-link-dashboard"
              >
                <DashboardIcon size={15} />
                <span>Dashboard</span>
              </Link>

              {/* Admin User Pill & Role Badge */}
              <div className="navbar__user-pill" title={`${user?.email} (${getRoleLabel()})`}>
                <span className="user-dot"></span>
                <span className="user-email">
                  {user?.email ? user.email.split('@')[0] : 'Admin'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-cyan-dim)',
                    color: 'var(--accent-cyan)',
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
                title="Sign out of admin session"
                aria-label="Logout"
              >
                <LogOutIcon size={15} />
              </button>
            </div>
          ) : (
            /* Standard Public & Coordinator Navbar */
            <div className="navbar__links" id="nav-links">
              <Link
                to="/"
                className={`navbar__link ${isActive('/') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/coordinator') ? 'navbar__link--active' : ''}`}
                id="nav-link-events"
              >
                Events
              </Link>
              <Link
                to="/today"
                className={`navbar__link ${isActive('/today') ? 'navbar__link--active' : ''}`}
                id="nav-link-today"
              >
                Happening Today
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

                  {/* Main Admin specific links when browsing public pages */}
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
          )}

          <button
            ref={toggleBtnRef}
            type="button"
            className={`navbar__mobile-toggle ${mobileOpen ? 'navbar__mobile-toggle--open' : ''}`}
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="nav-mobile-menu"
            id="nav-mobile-toggle"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Backdrop overlay */}
      {mobileOpen && (
        <div
          className="navbar__backdrop"
          onClick={closeMobile}
          aria-hidden="true"
          id="nav-mobile-backdrop"
        />
      )}

      {/* Mobile Drawer Navigation */}
      <div
        className={`navbar__mobile-menu ${mobileOpen ? 'open' : ''}`}
        id="nav-mobile-menu"
        role="navigation"
        aria-label="Mobile Navigation"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          to="/"
          className={`navbar__mobile-link ${isActive('/') && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/coordinator') ? 'navbar__mobile-link--active' : ''}`}
          id="nav-mobile-link-events"
          onClick={closeMobile}
        >
          Events
        </Link>
        <Link
          to="/today"
          className={`navbar__mobile-link ${isActive('/today') ? 'navbar__mobile-link--active' : ''}`}
          id="nav-mobile-link-today"
          onClick={closeMobile}
        >
          Happening Today
        </Link>
        <Link
          to="/about"
          className={`navbar__mobile-link ${isActive('/about') ? 'navbar__mobile-link--active' : ''}`}
          id="nav-mobile-link-about"
          onClick={closeMobile}
        >
          About
        </Link>

        {isAuthenticated ? (
          <>
            <Link
              to={getDashboardPath()}
              className="navbar__mobile-link navbar__mobile-link--admin"
              id="nav-mobile-link-dashboard"
              onClick={closeMobile}
            >
              <DashboardIcon size={16} />
              <span>{isMainAdmin ? 'Admin Dashboard' : isCoordinator ? 'Coordinator Dashboard' : 'My Application'}</span>
            </Link>

            {isUser && (
              <>
                <Link
                  to="/coordinator/request"
                  className="navbar__mobile-link"
                  id="nav-mobile-link-coord-request"
                  onClick={closeMobile}
                >
                  <UsersIcon size={16} />
                  <span>Request Coordinator Access</span>
                </Link>
                <Link
                  to="/coordinator/status"
                  className="navbar__mobile-link"
                  id="nav-mobile-link-coord-status"
                  onClick={closeMobile}
                >
                  <span>Application Status</span>
                </Link>
              </>
            )}

            {(isCoordinator || isMainAdmin) && (
              <Link
                to={isMainAdmin ? '/admin/events/new' : '/coordinator/events/new'}
                className="navbar__mobile-link"
                id="nav-mobile-link-new-event"
                onClick={closeMobile}
              >
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
              onClick={handleMobileLogout}
              className="navbar__mobile-logout"
              id="nav-mobile-logout-btn"
            >
              <LogOutIcon size={16} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link
              to="/register"
              className="navbar__mobile-link"
              id="nav-mobile-link-register"
              onClick={closeMobile}
            >
              <span>Register Student Account</span>
            </Link>
            <Link
              to="/admin/login"
              className={`navbar__mobile-link ${isActive('/admin/login') || isActive('/login') ? 'navbar__mobile-link--active' : ''}`}
              id="nav-mobile-link-login"
              onClick={closeMobile}
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
