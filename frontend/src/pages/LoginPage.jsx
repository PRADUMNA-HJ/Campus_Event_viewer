import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import {
  LockIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  SpinnerIcon,
  ArrowLeftIcon,
  CheckIcon,
} from '../components/Icons';

/**
 * Universal Login Page
 * 
 * Authenticates users across all three roles:
 * - ROLE_MAIN_ADMIN -> /admin/dashboard
 * - ROLE_COORDINATOR -> /coordinator/dashboard
 * - ROLE_USER -> /coordinator/request
 */
export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Flash message passed via state (e.g., from registration or logout)
  const flashMessage = location.state?.flashMessage || null;

  // If already logged in, redirect based on role
  if (isAuthenticated && user) {
    if (user.role === 'MAIN_ADMIN' || user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'COORDINATOR') {
      return <Navigate to="/coordinator/dashboard" replace />;
    }
    const destination = location.state?.from?.pathname || '/coordinator/status';
    return <Navigate to={destination} replace />;
  }

  const validateForm = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login(email.trim(), password);

      // Determine redirect destination based on authenticated role
      const effectiveRole = response.role;
      let targetPath = '/';

      if (effectiveRole === 'MAIN_ADMIN' || effectiveRole === 'ADMIN') {
        targetPath = '/admin/dashboard';
      } else if (effectiveRole === 'COORDINATOR') {
        targetPath = '/coordinator/dashboard';
      } else {
        // Regular user: respect original destination if exists, else coordinator flow
        targetPath = location.state?.from?.pathname || '/coordinator/status';
      }

      navigate(targetPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setGeneralError('Invalid email or password. Please verify your credentials.');
        } else if (err.status === 403) {
          setGeneralError('Your account has been disabled. Please contact the Main Admin.');
        } else if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
          setGeneralError('Please correct the validation errors below.');
        } else {
          setGeneralError(err.message || 'Authentication failed. Please try again.');
        }
      } else {
        setGeneralError('Unable to connect to the authentication server. Please verify the backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page" id="login-page">
      <div className="admin-login-container">
        <Link to="/" className="admin-login__back" id="back-to-home-link">
          <ArrowLeftIcon size={16} />
          <span>Back to Campus Events</span>
        </Link>

        <div className="admin-login-card">
          <div className="admin-login-card__header">
            <div className="admin-login-card__badge">
              <LockIcon size={20} />
              <span>CampusPulse Sign In</span>
            </div>
            <h1 className="admin-login-card__title">Welcome Back</h1>
            <p className="admin-login-card__subtitle">
              Sign in with your student, coordinator, or administrator credentials.
            </p>
          </div>

          {/* Flash Message */}
          {flashMessage && (
            <div className="alert alert--success" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
              <CheckIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <p className="alert__message">{flashMessage}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {generalError && (
            <div className="alert alert--danger" role="alert" id="login-error-alert" style={{ marginBottom: 'var(--space-6)' }}>
              <AlertCircleIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <p className="alert__message">{generalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="admin-login-form" id="login-form">
            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address <span className="form-required">*</span>
              </label>
              <div className="input-with-icon">
                <MailIcon size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className={`form-input ${fieldErrors.email ? 'form-input--error' : ''}`}
                  placeholder="name@college.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <span className="form-error" role="alert">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password" className="form-label">
                  Password <span className="form-required">*</span>
                </label>
              </div>
              <div className="input-with-icon">
                <LockIcon size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${fieldErrors.password ? 'form-input--error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="form-error" role="alert">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={isSubmitting}
              id="login-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon size={18} />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="admin-login-card__footer">
            <p>
              Don't have an account yet?{' '}
              <Link to="/register" style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
                Register as Student
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
