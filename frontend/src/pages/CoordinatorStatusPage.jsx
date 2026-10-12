import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyCoordinatorRequest, ApiError } from '../services/api';
import { formatDate } from '../utils/formatters';
import {
  UsersIcon,
  ClockIcon,
  CheckIcon,
  AlertCircleIcon,
  SpinnerIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  DashboardIcon,
} from '../components/Icons';

/**
 * Coordinator Request Status Page
 * 
 * Displays the current status of the user's coordinator application:
 * - PENDING
 * - APPROVED
 * - REJECTED
 * - REVOKED
 */
export default function CoordinatorStatusPage() {
  const { token, refreshUser } = useAuth();
  const location = useLocation();

  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const flashMessage = location.state?.flashMessage || null;

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyCoordinatorRequest(token);
      setRequest(data);
      // Refresh user profile in background
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setRequest(null);
      } else {
        setError(err.message || 'Unable to retrieve your request status.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadStatus();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="admin-loading" id="coordinator-status-loading">
        <div className="admin-loading__spinner">
          <SpinnerIcon size={32} />
        </div>
        <p className="admin-loading__text">Loading application status...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-12) 0', maxWidth: '720px' }} id="coordinator-status-page">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/" className="btn btn--ghost btn--sm" id="back-to-events-btn">
          <ArrowLeftIcon size={14} /> Back to Events
        </Link>
      </div>

      {/* Flash Message Banner */}
      {flashMessage && (
        <div className="alert alert--success alert--dismissible" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
          <CheckIcon size={20} className="alert__icon" />
          <div className="alert__content">
            <p className="alert__message">{flashMessage}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
          <AlertCircleIcon size={20} className="alert__icon" />
          <div className="alert__content">
            <p className="alert__message">{error}</p>
          </div>
        </div>
      )}

      {/* Main Card */}
      {!request ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <UsersIcon size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>No Application Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            You haven't submitted a request for coordinator privileges yet.
            If you represent a campus society or lead event planning, submit a request to the Main Admin.
          </p>
          <Link to="/coordinator/request" className="btn btn--primary" id="submit-new-req-btn">
            Submit Coordinator Request <ArrowRightIcon size={16} />
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
            <div>
              <span className="badge badge--admin" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
                Application #{request.id}
              </span>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                {request.organizationOrClub}
              </h1>
            </div>

            {/* Dynamic Status Badge */}
            {request.status === 'PENDING' && (
              <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '6px 12px', fontSize: '13px' }}>
                ⏳ Pending Review
              </span>
            )}
            {request.status === 'APPROVED' && (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', fontSize: '13px' }}>
                ✓ Approved
              </span>
            )}
            {request.status === 'REJECTED' && (
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', fontSize: '13px' }}>
                ✕ Not Approved
              </span>
            )}
            {request.status === 'REVOKED' && (
              <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '6px 12px', fontSize: '13px' }}>
                ⚠️ Access Revoked
              </span>
            )}
          </div>

          {/* Detailed Status Narrative */}
          {request.status === 'PENDING' && (
            <div className="alert alert--info" style={{ marginBottom: 'var(--space-6)' }}>
              <ClockIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <strong>Awaiting Main Admin Review:</strong>
                <p style={{ marginTop: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Your application submitted on <strong>{formatDate(request.requestedAt)}</strong> is waiting for the Main Admin's approval.
                  You will receive coordinator permissions as soon as your request is verified.
                </p>
              </div>
            </div>
          )}

          {request.status === 'APPROVED' && (
            <div className="alert alert--success" style={{ marginBottom: 'var(--space-6)' }}>
              <CheckIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <strong>Coordinator Access Granted:</strong>
                <p style={{ marginTop: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Your request was approved on <strong>{formatDate(request.reviewedAt)}</strong> by {request.reviewedByEmail || 'the Main Admin'}.
                  You can now create and manage events for {request.organizationOrClub}.
                </p>
              </div>
            </div>
          )}

          {request.status === 'REJECTED' && (
            <div className="alert alert--danger" style={{ marginBottom: 'var(--space-6)' }}>
              <AlertCircleIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <strong>Request Not Approved:</strong>
                <p style={{ marginTop: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Your application was reviewed on <strong>{formatDate(request.reviewedAt)}</strong>.
                </p>
                {request.reviewNote && (
                  <p style={{ marginTop: 'var(--space-2)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                    Admin Note: "{request.reviewNote}"
                  </p>
                )}
              </div>
            </div>
          )}

          {request.status === 'REVOKED' && (
            <div className="alert alert--danger" style={{ marginBottom: 'var(--space-6)' }}>
              <AlertCircleIcon size={20} className="alert__icon" />
              <div className="alert__content">
                <strong>Coordinator Privileges Revoked:</strong>
                <p style={{ marginTop: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Your coordinator privileges were revoked on <strong>{formatDate(request.reviewedAt)}</strong> by the Main Admin.
                  Your account has returned to standard student (<code style={{ color: 'var(--accent-cyan)' }}>ROLE_USER</code>) status.
                </p>
                {request.reviewNote && (
                  <p style={{ marginTop: 'var(--space-2)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                    Reason: "{request.reviewNote}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Application Reason
              </span>
              <p style={{ marginTop: 'var(--space-1)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {request.reason}
              </p>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Contact Information
              </span>
              <p style={{ marginTop: 'var(--space-1)', color: 'var(--text-primary)' }}>
                {request.contactDetails || 'None provided'}
              </p>
            </div>
          </div>

          {/* Action Button Section */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-6)' }}>
            {request.status === 'APPROVED' && (
              <Link to="/coordinator/dashboard" className="btn btn--primary" id="coordinator-dashboard-link-btn">
                <DashboardIcon size={16} /> Open Coordinator Dashboard
              </Link>
            )}

            {(request.status === 'REJECTED' || request.status === 'REVOKED') && (
              <Link to="/coordinator/request" className="btn btn--primary" id="resubmit-request-btn">
                Submit New Coordinator Request <ArrowRightIcon size={16} />
              </Link>
            )}

            <button type="button" onClick={loadStatus} className="btn btn--secondary btn--sm">
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
