import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { LockIcon, MailIcon, EyeIcon, EyeOffIcon, AlertCircleIcon, SpinnerIcon, ArrowLeftIcon } from '../components/Icons';

/**
 * Admin Login Page
 * 
 * Allows authorized administrators to authenticate with their email and password.
 * Does not expose public admin registration (accounts are bootstrapped via backend).
 */
export default function AdminLoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect immediately to dashboard
  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/admin/dashboard';
    return <Navigate to={destination} replace />;
  }

  // Validate form fields on the client
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
      await login(email.trim(), password);
      // Determine redirection destination
      const destination = location.state?.from?.pathname || '/admin/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setGeneralError('Invalid email or password. Please verify your credentials.');
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
    <div className="admin-login-page" id="admin-login-page">
      <div className="admin-login-container">
        {/* Back to public site */}
        <Link to="/" className="admin-login__back" id="back-to-home-link">
          <ArrowLeftIcon size={16} />
          <span>Back to Campus Events</span>
        </Link>

        <div className="admin-login-card">
          <div className="admin-login-card__header">
            <div className="admin-login-card__badge">
              <LockIcon size={20} />
              <span>Admin Access</span>
            </div>
            <h1 className="admin-login-card__title">CampusPulse Admin</h1>
            <p className="admin-login-card__subtitle">
              Sign in with your administrator credentials to manage events, hackathons, and workshops.
            </p>
          </div>

          {generalError && (
            <div className="alert alert--danger" id="login-error-alert" role="alert">
              <AlertCircleIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <p className="alert__message">{generalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form" noValidate id="admin-login-form">
            <div className="form-group">
              <label htmlFor="admin-email" className="form-label">
                Email Address
              </label>
              <div className="input-with-icon">
                <MailIcon size={18} className="input-icon" />
                <input
                  id="admin-email"
                  type="email"
                  className={`form-input ${fieldErrors.email ? 'form-input--error' : ''}`}
                  placeholder="admin@campus.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: null }));
                    }
                  }}
                  autoComplete="email"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.email && (
                <span className="form-error" id="admin-email-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="admin-password" className="form-label">
                Password
              </label>
              <div className="input-with-icon">
                <LockIcon size={18} className="input-icon" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${fieldErrors.password ? 'form-input--error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="input-trailing-action"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="form-error" id="admin-password-error">{fieldErrors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--full btn--lg"
              disabled={isSubmitting}
              id="admin-login-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon size={20} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LockIcon size={18} />
                  <span>Sign In as Admin</span>
                </>
              )}
            </button>
          </form>

          <div className="admin-login-card__footer">
            <p className="admin-login-card__note">
              🔒 Administrator accounts are pre-configured through server bootstrap.
              Public registration is disabled for platform security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
