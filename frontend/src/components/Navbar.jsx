import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LockIcon, DashboardIcon, LogOutIcon } from './Icons';

/**
 * Responsive navigation bar with scroll-aware styling, mobile menu,
 * and contextual admin navigation links.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

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
              className={`navbar__link ${isActive('/') && !location.pathname.startsWith('/admin') ? 'navbar__link--active' : ''}`}
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
                <Link
                  to="/admin/dashboard"
                  className={`navbar__link navbar__link--admin ${isActive('/admin') ? 'navbar__link--active' : ''}`}
                  id="nav-link-dashboard"
                >
                  <DashboardIcon size={15} />
                  <span>Dashboard</span>
                </Link>
                <div className="navbar__user-pill" title={user?.email || 'Administrator'}>
                  <span className="user-dot"></span>
                  <span className="user-email">{user?.email ? user.email.split('@')[0] : 'Admin'}</span>
                </div>
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
              <Link
                to="/admin/login"
                className={`navbar__link navbar__link--login ${isActive('/admin/login') ? 'navbar__link--active' : ''}`}
                id="nav-link-admin-login"
              >
                <LockIcon size={14} />
                <span>Admin</span>
              </Link>
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
          className={`navbar__mobile-link ${isActive('/') && !location.pathname.startsWith('/admin') ? 'navbar__mobile-link--active' : ''}`}
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
              to="/admin/dashboard"
              className={`navbar__mobile-link navbar__mobile-link--admin ${isActive('/admin') ? 'navbar__mobile-link--active' : ''}`}
            >
              <DashboardIcon size={16} />
              <span>Admin Dashboard</span>
            </Link>
            <div className="navbar__mobile-user">
              <span>Signed in as: <strong>{user?.email || 'admin@campus.edu'}</strong></span>
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
          <Link
            to="/admin/login"
            className={`navbar__mobile-link ${isActive('/admin/login') ? 'navbar__mobile-link--active' : ''}`}
          >
            <LockIcon size={16} />
            <span>Admin Login</span>
          </Link>
        )}
      </div>
    </>
  );
}
