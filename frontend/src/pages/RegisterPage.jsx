import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, ApiError } from '../services/api';
import {
  LockIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  CheckIcon,
  SpinnerIcon,
  ArrowLeftIcon,
  UsersIcon,
} from '../components/Icons';

/**
 * Registration Page
 * 
 * Allows students and campus members to register as regular users (ROLE_USER).
 * Strictly forbids role selection: every account registered here is granted ROLE_USER.
 */
export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setSuccessMessage(response.message || 'Account registered successfully! Signing you in...');

      // Auto sign-in after successful registration
      try {
        await login(email.trim(), password);
        setTimeout(() => {
          navigate('/coordinator/request', { replace: true });
        }, 1200);
      } catch {
        // If auto-login fails, redirect to /login
        setTimeout(() => {
          navigate('/login', {
            state: { flashMessage: 'Registration successful! Please sign in with your credentials.' },
            replace: true,
          });
        }, 1500);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setGeneralError('An account with this email address already exists. Please sign in instead.');
        } else if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
          setGeneralError('Please correct the validation errors below.');
        } else {
          setGeneralError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setGeneralError('Unable to connect to the registration service. Please verify the backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page" id="register-page">
      <div className="admin-login-container">
        <Link to="/" className="admin-login__back" id="back-to-home-link">
          <ArrowLeftIcon size={16} />
          <span>Back to Campus Events</span>
        </Link>

        <div className="admin-login-card">
          <div className="admin-login-card__header">
            <div className="admin-login-card__badge" style={{ background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}>
              <UsersIcon size={20} />
              <span>Student Account</span>
            </div>
            <h1 className="admin-login-card__title">Create Account</h1>
            <p className="admin-login-card__subtitle">
              Join CampusPulse to follow campus activities, hackathons, and request event coordinator privileges.
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="alert alert--success" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
              <CheckIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <p className="alert__message">{successMessage}</p>
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {generalError && (
            <div className="alert alert--danger" role="alert" id="register-error-alert" style={{ marginBottom: 'var(--space-6)' }}>
              <AlertCircleIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <p className="alert__message">{generalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="admin-login-form" id="register-form">
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="register-name" className="form-label">
                Full Name <span className="form-required">*</span>
              </label>
              <div className="input-with-icon">
                <UsersIcon size={18} className="input-icon" />
                <input
                  id="register-name"
                  type="text"
                  className={`form-input ${fieldErrors.name ? 'form-input--error' : ''}`}
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="name"
                />
              </div>
              {fieldErrors.name && (
                <span className="form-error" role="alert">
                  {fieldErrors.name}
                </span>
              )}
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="register-email" className="form-label">
                Campus Email <span className="form-required">*</span>
              </label>
              <div className="input-with-icon">
                <MailIcon size={18} className="input-icon" />
                <input
                  id="register-email"
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
              <label htmlFor="register-password" className="form-label">
                Password <span className="form-required">*</span>
              </label>
              <div className="input-with-icon">
                <LockIcon size={18} className="input-icon" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${fieldErrors.password ? 'form-input--error' : ''}`}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="register-confirm-password" className="form-label">
                Confirm Password <span className="form-required">*</span>
              </label>
              <div className="input-with-icon">
                <LockIcon size={18} className="input-icon" />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${fieldErrors.confirmPassword ? 'form-input--error' : ''}`}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: null }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
              </div>
              {fieldErrors.confirmPassword && (
                <span className="form-error" role="alert">
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            {/* Notice regarding role assignment */}
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: 'var(--space-4)',
            }}>
              <p>
                <strong>Role Notice:</strong> New accounts are registered as standard users (<code style={{ color: 'var(--accent-cyan)' }}>ROLE_USER</code>).
                After registering, you can request event coordinator privileges from your account dashboard.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={isSubmitting}
              id="register-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon size={18} />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Student Account</span>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="admin-login-card__footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
