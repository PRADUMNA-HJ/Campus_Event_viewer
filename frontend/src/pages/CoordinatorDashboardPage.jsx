import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyEvents, deleteEvent, ApiError } from '../services/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {
  formatDate,
  formatTime,
  getEventTypeEmoji,
} from '../utils/formatters';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
  CheckIcon,
  SpinnerIcon,
  LogOutIcon,
  DashboardIcon,
  CalendarIcon,
  ClockIcon,
} from '../components/Icons';

/**
 * Coordinator Dashboard Page
 * 
 * Control center for approved student coordinators to manage their campus events.
 * Displays real stats, submission statuses (PENDING_REVIEW, PUBLISHED, REJECTED),
 * and provides full event creation and editing workflows.
 */
export default function CoordinatorDashboardPage() {
  const { user, token, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Events list state
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Delete modal state
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [flashMessage, setFlashMessage] = useState(location.state?.flashMessage || null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setFlashMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEvents = await fetchMyEvents(token);
      setEvents(fetchedEvents);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // Coordinator privilege revoked
        await refreshUser();
        navigate('/coordinator/status', {
          state: { flashMessage: 'Your coordinator privileges have been revoked by the Main Admin.' },
          replace: true,
        });
        return;
      }
      setError(err.message || 'Failed to load coordinator events.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadEvents();
    }
  }, [token]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !searchQuery.trim() ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' || event.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  // KPI counts
  const stats = useMemo(() => {
    const total = events.length;
    const pending = events.filter((e) => e.status === 'PENDING_REVIEW').length;
    const published = events.filter((e) => e.status === 'PUBLISHED').length;
    const rejected = events.filter((e) => e.status === 'REJECTED').length;
    return { total, pending, published, rejected };
  }, [events]);

  // Handle Event Deletion
  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteEvent(eventToDelete.id, token);
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      setFlashMessage(`Event "${eventToDelete.title}" has been deleted.`);
      setEventToDelete(null);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setErrorMessage('Permission denied: You can only delete events that you created.');
        } else {
          setErrorMessage(err.message || 'Failed to delete event.');
        }
      } else {
        setErrorMessage('Unable to connect to server. Deletion aborted.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-dashboard-page" id="coordinator-dashboard-page">
      {/* Top Banner & Header */}
      <div className="admin-header">
        <div className="container admin-header__inner">
          <div className="admin-header__brand">
            <div className="admin-header__icon" style={{ background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}>
              <DashboardIcon size={24} />
            </div>
            <div>
              <div className="admin-header__title-row">
                <h1 className="admin-header__title">Coordinator Dashboard</h1>
                <span className="badge badge--coordinator" style={{ background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)' }}>
                  ROLE_COORDINATOR
                </span>
              </div>
              <p className="admin-header__email">
                Organizer: <strong>{user?.name || user?.email}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <div className="admin-header__actions">
            <Link to="/" className="btn btn--secondary btn--sm" id="view-public-site-btn">
              <ExternalLinkIcon size={14} />
              <span>Public Site</span>
            </Link>
            <Link to="/coordinator/events/new" className="btn btn--primary btn--sm" id="create-event-top-btn">
              <PlusIcon size={16} />
              <span>New Event</span>
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={logout}
              id="coordinator-logout-btn"
              title="Sign out of session"
            >
              <LogOutIcon size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container admin-dashboard-content">
        {/* Flash Message Banner */}
        {flashMessage && (
          <div className="alert alert--success alert--dismissible" role="alert" id="dashboard-flash-success">
            <CheckIcon size={20} className="alert__icon" />
            <div className="alert__content">
              <p className="alert__message">{flashMessage}</p>
            </div>
            <button
              type="button"
              className="alert__close"
              onClick={() => setFlashMessage(null)}
              aria-label="Dismiss alert"
            >
              &times;
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert alert--danger alert--dismissible" role="alert" id="dashboard-error-alert">
            <AlertCircleIcon size={20} className="alert__icon" />
            <div className="alert__content">
              <p className="alert__message">{errorMessage}</p>
            </div>
            <button
              type="button"
              className="alert__close"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss alert"
            >
              &times;
            </button>
          </div>
        )}

        {/* Governance Notice */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4) var(--space-6)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}>
          <ClockIcon size={24} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Event Approval Workflow:</strong> All new events are submitted for Main Admin review in <code style={{ color: '#fbbf24' }}>PENDING_REVIEW</code> status before publication. Any edits to an already published event will automatically return it to review status for administrative verification.
          </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--cyan">
              <CalendarIcon size={22} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">My Events</span>
              <span className="stat-card__value" id="coord-stat-total">{stats.total}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--orange">
              <ClockIcon size={22} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Pending Review</span>
              <span className="stat-card__value" id="coord-stat-pending">{stats.pending}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--green">
              <CheckIcon size={22} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Published</span>
              <span className="stat-card__value" id="coord-stat-published">{stats.published}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              <AlertCircleIcon size={22} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Rejected</span>
              <span className="stat-card__value" id="coord-stat-rejected">{stats.rejected}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-toolbar__search">
            <SearchIcon size={18} className="search-icon" />
            <input
              type="text"
              className="admin-toolbar__input"
              placeholder="Search your events by title or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="coordinator-search-input"
            />
          </div>

          <div className="admin-toolbar__filters">
            <div className="filter-select-wrapper">
              <FilterIcon size={14} className="filter-icon" />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                id="coordinator-status-filter"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="PUBLISHED">Published</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={loadEvents}
              title="Refresh your events list"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Content Table or Empty State */}
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-loading__spinner">
              <SpinnerIcon size={32} />
            </div>
            <p className="admin-loading__text">Loading your events...</p>
          </div>
        ) : error ? (
          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <AlertCircleIcon size={36} style={{ color: '#f87171', margin: '0 auto var(--space-4)' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>{error}</p>
            <button type="button" onClick={loadEvents} className="btn btn--primary btn--sm">
              Try Again
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <CalendarIcon size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
            <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>No Events Found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'No events match your current filter criteria.'
                : 'You have not submitted any campus events yet.'}
            </p>
            <Link to="/coordinator/events/new" className="btn btn--primary" id="coordinator-empty-create-btn">
              <PlusIcon size={16} /> Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="card admin-table-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Venue</th>
                    <th>Review Feedback</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id} id={`coordinator-event-row-${event.id}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          {event.bannerUrl ? (
                            <img
                              src={event.bannerUrl}
                              alt=""
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: 'var(--radius-sm)',
                                objectFit: 'cover',
                                border: '1px solid var(--border-card)',
                                flexShrink: 0,
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline-block';
                              }}
                            />
                          ) : null}
                          <span style={{ fontSize: '1.25rem', display: event.bannerUrl ? 'none' : 'inline-block' }}>
                            {getEventTypeEmoji(event.eventType)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: '2px' }}>
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                {event.eventType}
                              </span>
                              {event.bannerUrl && (
                                <span
                                  className="badge"
                                  title={`Banner URL: ${event.bannerUrl}`}
                                  style={{ fontSize: '10px', padding: '1px 5px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                                >
                                  Banner
                                </span>
                              )}
                              {event.qrCodeUrl && (
                                <span
                                  className="badge"
                                  title={`QR Code URL: ${event.qrCodeUrl}`}
                                  style={{ fontSize: '10px', padding: '1px 5px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' }}
                                >
                                  QR
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {event.status === 'PUBLISHED' && (
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            ✓ Published
                          </span>
                        )}
                        {event.status === 'PENDING_REVIEW' && (
                          <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                            ⏳ Pending Review
                          </span>
                        )}
                        {event.status === 'REJECTED' && (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            ✕ Rejected
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                          {formatDate(event.startDateTime)}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          {formatTime(event.startDateTime)}
                        </div>
                      </td>
                      <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {event.location || 'Online / TBD'}
                      </td>
                      <td>
                        {event.status === 'REJECTED' && event.reviewNote ? (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: '#f87171', fontStyle: 'italic', maxWidth: '200px' }}>
                            "{event.reviewNote}"
                          </div>
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                          <Link
                            to={`/events/${event.id}`}
                            className="btn btn--ghost btn--sm"
                            title="View Public Details"
                          >
                            <ExternalLinkIcon size={14} />
                          </Link>
                          <Link
                            to={`/coordinator/events/${event.id}/edit`}
                            className="btn btn--secondary btn--sm"
                            title="Edit Event"
                          >
                            <EditIcon size={14} />
                          </Link>
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() => setEventToDelete(event)}
                            title="Delete Event"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(eventToDelete)}
        event={eventToDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setEventToDelete(null)}
      />
    </div>
  );
}
