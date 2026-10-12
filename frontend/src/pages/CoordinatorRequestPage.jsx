import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitCoordinatorRequest, fetchMyCoordinatorRequest, ApiError } from '../services/api';
import {
  UsersIcon,
  AlertCircleIcon,
  CheckIcon,
  SpinnerIcon,
  ArrowLeftIcon,
  ClockIcon,
  ArrowRightIcon,
} from '../components/Icons';

/**
 * Coordinator Request Page
 * 
 * Allows authenticated ordinary users (ROLE_USER) to request event coordinator privileges.
 * Prohibits setting the request status directly.
 */
export default function CoordinatorRequestPage() {
  const { token, user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [organizationOrClub, setOrganizationOrClub] = useState('');
  const [reason, setReason] = useState('');
  const [contactDetails, setContactDetails] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Check if user already has an active request
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      if (!token) return;
      try {
        const req = await fetchMyCoordinatorRequest(token);
        if (isMounted) {
          setExistingRequest(req);
        }
      } catch {
        // No request or error
      } finally {
        if (isMounted) {
          setLoadingExisting(false);
        }
      }
    }
    checkStatus();
    return () => { isMounted = false; };
  }, [token]);

  const validateForm = () => {
    const errors = {};
    if (!organizationOrClub.trim()) {
      errors.organizationOrClub = 'Club or student organization name is required.';
    } else if (organizationOrClub.trim().length < 3) {
      errors.organizationOrClub = 'Organization name must be at least 3 characters.';
    }

    if (!reason.trim()) {
      errors.reason = 'Please provide a reason explaining your organizing responsibilities.';
    } else if (reason.trim().length < 15) {
      errors.reason = 'Reason must be at least 15 characters long.';
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
      await submitCoordinatorRequest(
        {
          organizationOrClub: organizationOrClub.trim(),
          reason: reason.trim(),
          contactDetails: contactDetails.trim() || null,
        },
        token
      );

      // Refresh profile to pick up updated coordinatorRequestStatus
      await refreshUser();

      navigate('/coordinator/status', {
        state: { flashMessage: 'Your coordinator application has been submitted and is under Main Admin review.' },
        replace: true,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setGeneralError('You already have a pending coordinator request awaiting review.');
        } else if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
          setGeneralError('Please correct the validation errors below.');
        } else {
          setGeneralError(err.message || 'Failed to submit coordinator request.');
        }
      } else {
        setGeneralError('Unable to connect to the server. Please verify backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="admin-loading" id="coordinator-request-loading">
        <div className="admin-loading__spinner">
          <SpinnerIcon size={32} />
        </div>
        <p className="admin-loading__text">Checking account status...</p>
      </div>
    );
  }

  // If user already has an active or pending request, show status banner and redirect option
  if (existingRequest && existingRequest.status === 'PENDING') {
    return (
      <div className="container" style={{ padding: 'var(--space-12) 0', maxWidth: '680px' }}>
        <div className="alert alert--info" role="status" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <ClockIcon size={36} style={{ color: 'var(--accent-cyan)', margin: '0 auto var(--space-4)' }} />
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>Request Under Review</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            You already submitted a coordinator request for <strong>{existingRequest.organizationOrClub}</strong>.
            The Main Admin is currently evaluating your application.
          </p>
          <Link to="/coordinator/status" className="btn btn--primary" id="view-status-btn">
            View Request Status <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role === 'COORDINATOR') {
    return (
      <div className="container" style={{ padding: 'var(--space-12) 0', maxWidth: '680px' }}>
        <div className="alert alert--success" role="status" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <CheckIcon size={36} style={{ color: 'var(--accent-green)', margin: '0 auto var(--space-4)' }} />
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>You Are a Coordinator</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Your account already possesses coordinator privileges. You can publish campus events directly for review.
          </p>
          <Link to="/coordinator/dashboard" className="btn btn--primary" id="go-to-coordinator-dashboard-btn">
            Go to Coordinator Dashboard <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-page" id="coordinator-request-page">
      <div className="admin-login-container" style={{ maxWidth: '620px' }}>
        <Link to="/" className="admin-login__back" id="back-to-home-link">
          <ArrowLeftIcon size={16} />
          <span>Back to Campus Events</span>
        </Link>

        <div className="admin-login-card">
          <div className="admin-login-card__header">
            <div className="admin-login-card__badge" style={{ background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)' }}>
              <UsersIcon size={20} />
              <span>Privilege Elevation</span>
            </div>
            <h1 className="admin-login-card__title">Request Coordinator Access</h1>
            <p className="admin-login-card__subtitle">
              Club leads and event organizers can submit a request to the Main Admin to publish campus events and hackathons.
            </p>
          </div>

          {generalError && (
            <div className="alert alert--danger" role="alert" id="request-error-alert" style={{ marginBottom: 'var(--space-6)' }}>
              <AlertCircleIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <p className="alert__message">{generalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="admin-login-form" id="coordinator-request-form">
            {/* Club / Organization */}
            <div className="form-group">
              <label htmlFor="req-organization" className="form-label">
                Organization, Club, or Society Name <span className="form-required">*</span>
              </label>
              <input
                id="req-organization"
                type="text"
                className={`form-input ${fieldErrors.organizationOrClub ? 'form-input--error' : ''}`}
                placeholder="e.g. Robotics Club, IEEE Student Chapter, Cultural Committee"
                value={organizationOrClub}
                onChange={(e) => {
                  setOrganizationOrClub(e.target.value);
                  if (fieldErrors.organizationOrClub) setFieldErrors((prev) => ({ ...prev, organizationOrClub: null }));
                }}
                disabled={isSubmitting}
              />
              {fieldErrors.organizationOrClub && (
                <span className="form-error" role="alert">
                  {fieldErrors.organizationOrClub}
                </span>
              )}
            </div>

            {/* Reason */}
            <div className="form-group">
              <label htmlFor="req-reason" className="form-label">
                Reason & Organizing Responsibilities <span className="form-required">*</span>
              </label>
              <textarea
                id="req-reason"
                rows={4}
                className={`form-input ${fieldErrors.reason ? 'form-input--error' : ''}`}
                placeholder="Describe the types of events or hackathons your team will organize on campus..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (fieldErrors.reason) setFieldErrors((prev) => ({ ...prev, reason: null }));
                }}
                disabled={isSubmitting}
                style={{ resize: 'vertical' }}
              />
              {fieldErrors.reason && (
                <span className="form-error" role="alert">
                  {fieldErrors.reason}
                </span>
              )}
            </div>

            {/* Contact Details */}
            <div className="form-group">
              <label htmlFor="req-contact" className="form-label">
                Official Contact / Phone (Optional)
              </label>
              <input
                id="req-contact"
                type="text"
                className="form-input"
                placeholder="e.g. +91 9876543210 or club.president@college.edu"
                value={contactDetails}
                onChange={(e) => setContactDetails(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Information Policy */}
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
                <strong>Security Policy:</strong> Applications are reviewed manually by the Main Admin.
                Once approved, you will be able to create events which will be submitted for publication review.
                The Main Admin can revoke privileges at any time.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={isSubmitting}
              id="submit-coordinator-req-btn"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon size={18} />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <span>Submit Coordinator Request</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
