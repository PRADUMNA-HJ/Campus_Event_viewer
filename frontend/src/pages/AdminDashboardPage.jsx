import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchEvents,
  publishEventAdmin,
  rejectEventAdmin,
  deleteEvent,
  fetchCoordinatorRequests,
  approveCoordinatorRequest,
  rejectCoordinatorRequest,
  fetchCoordinators,
  revokeCoordinator,
  ApiError,
} from '../services/api';
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
  UsersIcon,
  CalendarIcon,
  ClockIcon,
} from '../components/Icons';

/**
 * Main Admin Dashboard Page
 * 
 * Central control hub for managing CampusPulse:
 * - Tab 1: All Events & Moderation (Publish, Reject with note, Edit, Delete)
 * - Tab 2: Coordinator Requests (Approve, Reject with review note)
 * - Tab 3: Coordinator Roster & Immediate Access Revocation
 */
export default function AdminDashboardPage() {
  const { user, token, logout } = useAuth();
  const location = useLocation();

  // Active Tab: 'events' | 'requests' | 'coordinators'
  const [activeTab, setActiveTab] = useState('events');

  // Events state
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state for Events
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Coordinator Requests state
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState('PENDING');

  // Coordinators state
  const [coordinators, setCoordinators] = useState([]);
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(false);

  // Action Modals state
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Event Reject Modal
  const [eventToReject, setEventToReject] = useState(null);
  const [eventRejectNote, setEventRejectNote] = useState('');
  const [isRejectingEvent, setIsRejectingEvent] = useState(false);

  // Request Review Modal
  const [requestToReview, setRequestToReview] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [requestReviewNote, setRequestReviewNote] = useState('');
  const [isReviewingRequest, setIsReviewingRequest] = useState(false);

  // Coordinator Revoke Modal
  const [coordToRevoke, setCoordToRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevokingCoord, setIsRevokingCoord] = useState(false);

  // Notifications
  const [flashMessage, setFlashMessage] = useState(location.state?.flashMessage || null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setFlashMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  // Load events using fetchEvents for exact contract compatibility
  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { events: fetchedEvents } = await fetchEvents();
      setEvents(fetchedEvents);
    } catch (err) {
      setError(err.message || 'Failed to load events.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Coordinator Requests
  const loadRequests = async () => {
    if (!token) return;
    setRequestsLoading(true);
    try {
      const data = await fetchCoordinatorRequests(null, token);
      setRequests(data);
    } catch {
      // Graceful fallback
    } finally {
      setRequestsLoading(false);
    }
  };

  // Load Coordinators Roster
  const loadCoordinators = async () => {
    if (!token) return;
    setCoordinatorsLoading(true);
    try {
      const data = await fetchCoordinators(token);
      setCoordinators(data);
    } catch {
      // Graceful fallback
    } finally {
      setCoordinatorsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    if (token) {
      loadRequests();
      loadCoordinators();
    }
  }, [token]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !searchQuery.trim() ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.organizerName && event.organizerName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' || event.status === statusFilter;

      const matchesType =
        typeFilter === 'ALL' || event.eventType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [events, searchQuery, statusFilter, typeFilter]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    if (requestStatusFilter === 'ALL') return requests;
    return requests.filter((r) => r.status === requestStatusFilter);
  }, [requests, requestStatusFilter]);

  // KPI calculations
  const stats = useMemo(() => {
    const total = events.length;
    const hackathons = events.filter((e) => e.eventType === 'HACKATHON').length;
    const workshops = events.filter((e) => e.eventType === 'WORKSHOP').length;
    const published = events.filter((e) => e.status === 'PUBLISHED').length;
    const pendingEvents = events.filter((e) => e.status === 'PENDING_REVIEW').length;
    const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
    const activeCoordinators = coordinators.length;
    return { total, hackathons, workshops, published, pendingEvents, pendingRequests, activeCoordinators };
  }, [events, requests, coordinators]);

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
        setErrorMessage(err.message || 'Failed to delete event.');
      } else {
        setErrorMessage('Unable to connect to server. Deletion aborted.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Publish Event
  const handlePublishEvent = async (eventId, title) => {
    try {
      const updated = await publishEventAdmin(eventId, token);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      setFlashMessage(`Event "${title}" has been published to the public site.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to publish event.');
    }
  };

  // Handle Reject Event
  const handleRejectEventConfirm = async () => {
    if (!eventToReject) return;
    setIsRejectingEvent(true);
    try {
      const updated = await rejectEventAdmin(eventToReject.id, token, eventRejectNote.trim() || null);
      setEvents((prev) => prev.map((e) => (e.id === eventToReject.id ? updated : e)));
      setFlashMessage(`Event "${eventToReject.title}" has been rejected.`);
      setEventToReject(null);
      setEventRejectNote('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reject event.');
    } finally {
      setIsRejectingEvent(false);
    }
  };

  // Handle Coordinator Request Decision
  const handleReviewRequestConfirm = async () => {
    if (!requestToReview) return;
    setIsReviewingRequest(true);
    try {
      const reviewDto = requestReviewNote.trim() ? { reviewNote: requestReviewNote.trim() } : {};
      let result;
      if (reviewAction === 'APPROVE') {
        result = await approveCoordinatorRequest(requestToReview.id, token, reviewDto);
        setFlashMessage(`Approved coordinator request for ${requestToReview.organizationOrClub}. User is now ROLE_COORDINATOR.`);
      } else {
        result = await rejectCoordinatorRequest(requestToReview.id, token, reviewDto);
        setFlashMessage(`Rejected coordinator request for ${requestToReview.organizationOrClub}.`);
      }
      setRequests((prev) => prev.map((r) => (r.id === requestToReview.id ? result : r)));
      await loadCoordinators();
      setRequestToReview(null);
      setRequestReviewNote('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to process coordinator request.');
    } finally {
      setIsReviewingRequest(false);
    }
  };

  // Handle Revoke Coordinator
  const handleRevokeCoordinatorConfirm = async () => {
    if (!coordToRevoke) return;
    setIsRevokingCoord(true);
    try {
      await revokeCoordinator(coordToRevoke.id, token, revokeReason.trim() || null);
      setFlashMessage(`Coordinator privileges for ${coordToRevoke.email} have been revoked immediately. Account returned to ROLE_USER.`);
      setCoordinators((prev) => prev.filter((c) => c.id !== coordToRevoke.id));
      await loadRequests();
      setCoordToRevoke(null);
      setRevokeReason('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to revoke coordinator privileges.');
    } finally {
      setIsRevokingCoord(false);
    }
  };

  return (
    <div className="admin-dashboard-page" id="admin-dashboard-page">
      {/* Top Banner & Header */}
      <div className="admin-header">
        <div className="container admin-header__inner">
          <div className="admin-header__brand">
            <div className="admin-header__icon">
              <DashboardIcon size={24} />
            </div>
            <div>
              <div className="admin-header__title-row">
                <h1 className="admin-header__title">Admin Dashboard</h1>
                <span className="badge badge--admin">ROLE_ADMIN</span>
              </div>
              <p className="admin-header__email">
                Signed in as: <strong>{user?.email || 'admin@campus.edu'}</strong>
              </p>
            </div>
          </div>

          <div className="admin-header__actions">
            <Link to="/" className="btn btn--secondary btn--sm" id="view-public-site-btn">
              <ExternalLinkIcon size={14} />
              <span>Public Site</span>
            </Link>
            <Link to="/admin/events/new" className="btn btn--primary btn--sm" id="create-event-top-btn">
              <PlusIcon size={16} />
              <span>New Event</span>
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={logout}
              id="admin-logout-btn"
              title="Sign out of admin session"
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

        {/* KPI Metrics Cards */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--cyan">
              <CalendarIcon size={22} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Total Events</span>
              <span className="stat-card__value" id="stat-total-events">{stats.total}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--green">
              <CheckIcon size={22} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Published</span>
              <span className="stat-card__value" id="stat-published-events">{stats.published}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--purple">
              <span>🚀</span>
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Hackathons</span>
              <span className="stat-card__value" id="stat-hackathons">{stats.hackathons}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--orange">
              <span>🔧</span>
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Workshops</span>
              <span className="stat-card__value" id="stat-workshops">{stats.workshops}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-card)', marginBottom: 'var(--space-6)' }}>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'events' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('events')}
            id="admin-tab-events"
          >
            <CalendarIcon size={15} /> All Events & Moderation ({events.length})
          </button>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'requests' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('requests')}
            id="admin-tab-requests"
          >
            <ClockIcon size={15} /> Coordinator Requests ({stats.pendingRequests} Pending)
          </button>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'coordinators' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('coordinators')}
            id="admin-tab-coordinators"
          >
            <UsersIcon size={15} /> Active Coordinators ({stats.activeCoordinators})
          </button>
        </div>

        {/* TAB 1: ALL EVENTS & MODERATION */}
        {activeTab === 'events' && (
          <>
            {/* Action & Filter Toolbar */}
            <div className="admin-toolbar">
              <div className="admin-toolbar__search">
                <SearchIcon size={18} className="search-icon" />
                <input
                  type="text"
                  className="admin-toolbar__input"
                  placeholder="Search by title, location, or organizer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="admin-search-input"
                />
              </div>

              <div className="admin-toolbar__filters">
                <div className="filter-select-wrapper">
                  <FilterIcon size={14} className="filter-icon" />
                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    id="admin-status-filter"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>

                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    id="admin-type-filter"
                  >
                    <option value="ALL">All Types</option>
                    <option value="HACKATHON">Hackathons</option>
                    <option value="WORKSHOP">Workshops</option>
                    <option value="SEMINAR">Seminars</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="CULTURAL">Cultural</option>
                    <option value="GUEST_LECTURE">Guest Lectures</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={loadEvents}
                  title="Refresh events list"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Event Table, Error, or Empty State */}
            {isLoading ? (
              <div className="admin-loading">
                <div className="admin-loading__spinner">
                  <SpinnerIcon size={32} />
                </div>
                <p className="admin-loading__text">Loading campus events...</p>
              </div>
            ) : error ? (
              <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                <AlertCircleIcon size={48} style={{ color: '#f87171', margin: '0 auto var(--space-4)' }} />
                <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>Failed to Load Events</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>{error}</p>
                <button
                  type="button"
                  onClick={loadEvents}
                  className="btn btn--primary"
                  id="admin-retry-events-btn"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                <CalendarIcon size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
                <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>No Events Found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                  {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                    ? 'No events match your current filter criteria.'
                    : 'Get started by creating the first event on CampusPulse.'}
                </p>
                <Link to="/admin/events/new" className="btn btn--primary" id="create-first-event-btn">
                  <PlusIcon size={16} /> Create First Event
                </Link>
              </div>
            ) : (
              <div className="card admin-table-card">
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Organizer</th>
                        <th>Status</th>
                        <th>Date & Time</th>
                        <th>Location</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event) => (
                        <tr key={event.id} id={`admin-event-row-${event.id}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                              <span style={{ fontSize: '1.25rem' }}>{getEventTypeEmoji(event.eventType)}</span>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</div>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                  {event.eventType}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                              by {event.organizerName || 'Campus'}
                            </span>
                          </td>
                          <td>
                            {event.status === 'PUBLISHED' && (
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                PUBLISHED
                              </span>
                            )}
                            {event.status === 'PENDING_REVIEW' && (
                              <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                PENDING_REVIEW
                              </span>
                            )}
                            {event.status === 'REJECTED' && (
                              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                REJECTED
                              </span>
                            )}
                            {event.status !== 'PUBLISHED' && event.status !== 'PENDING_REVIEW' && event.status !== 'REJECTED' && (
                              <span className="badge badge--admin">{event.status}</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: 'var(--font-size-sm)' }}>{formatDate(event.startDateTime)}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                              {formatTime(event.startDateTime)}
                            </div>
                          </td>
                          <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {event.location || 'Online / TBD'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* Moderation Actions for Pending Events */}
                              {event.status === 'PENDING_REVIEW' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn--sm"
                                    style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981' }}
                                    onClick={() => handlePublishEvent(event.id, event.title)}
                                    title="Publish Event"
                                  >
                                    Publish
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--sm"
                                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444' }}
                                    onClick={() => {
                                      setEventToReject(event);
                                      setEventRejectNote('');
                                    }}
                                    title="Reject Event"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              <Link
                                to={`/events/${event.id}`}
                                className="btn btn--ghost btn--sm"
                                title="View Public Details"
                              >
                                <ExternalLinkIcon size={14} />
                              </Link>
                              <Link
                                to={`/admin/events/${event.id}/edit`}
                                className="btn btn--secondary btn--sm"
                                title="Edit Event"
                              >
                                <EditIcon size={14} />
                              </Link>
                              <button
                                type="button"
                                className="btn btn--danger btn--sm"
                                onClick={() => setEventToDelete(event)}
                                aria-label={`Delete ${event.title}`}
                                title={`Delete ${event.title}`}
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
          </>
        )}

        {/* TAB 2: COORDINATOR REQUESTS */}
        {activeTab === 'requests' && (
          <div className="card admin-table-card">
            <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Coordinator Privilege Requests</h3>
                <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  Review applications from student organizers to grant ROLE_COORDINATOR access.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <select
                  className="filter-select"
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Applications</option>
                  <option value="PENDING">Pending Review Only</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REVOKED">Revoked</option>
                </select>
                <button type="button" className="btn btn--secondary btn--sm" onClick={loadRequests}>
                  Refresh
                </button>
              </div>
            </div>

            {requestsLoading ? (
              <div className="admin-loading">
                <div className="admin-loading__spinner">
                  <SpinnerIcon size={32} />
                </div>
                <p className="admin-loading__text">Loading coordinator requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                <UsersIcon size={40} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
                <h4 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-2)' }}>No Requests Found</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  No applications match status "{requestStatusFilter}".
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Requester</th>
                      <th>Club / Society</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th style={{ textAlign: 'right' }}>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req.id}>
                        <td>#{req.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{req.userName || 'Student'}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{req.userEmail}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: 'var(--accent-cyan)' }}>
                            {req.organizationOrClub}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', maxWidth: '280px', whiteSpace: 'pre-wrap' }}>
                            {req.reason}
                          </div>
                          {req.contactDetails && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Contact: {req.contactDetails}
                            </div>
                          )}
                        </td>
                        <td>
                          {req.status === 'PENDING' && (
                            <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                              ⏳ Pending
                            </span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              ✓ Approved
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              ✕ Rejected
                            </span>
                          )}
                          {req.status === 'REVOKED' && (
                            <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                              ⚠️ Revoked
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          {formatDate(req.requestedAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {req.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn--sm"
                                style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981' }}
                                onClick={() => {
                                  setRequestToReview(req);
                                  setReviewAction('APPROVE');
                                  setRequestReviewNote('');
                                }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm"
                                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444' }}
                                onClick={() => {
                                  setRequestToReview(req);
                                  setReviewAction('REJECT');
                                  setRequestReviewNote('');
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                              {req.reviewedByEmail ? `By ${req.reviewedByEmail.split('@')[0]}` : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COORDINATOR ROSTER & IMMEDIATE REVOCATION */}
        {activeTab === 'coordinators' && (
          <div className="card admin-table-card">
            <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Active Coordinators</h3>
                <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  Accounts with ROLE_COORDINATOR privileges. Revocation takes effect immediately on the server.
                </p>
              </div>
              <button type="button" className="btn btn--secondary btn--sm" onClick={loadCoordinators}>
                Refresh
              </button>
            </div>

            {coordinatorsLoading ? (
              <div className="admin-loading">
                <div className="admin-loading__spinner">
                  <SpinnerIcon size={32} />
                </div>
                <p className="admin-loading__text">Loading coordinator roster...</p>
              </div>
            ) : coordinators.length === 0 ? (
              <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                <UsersIcon size={40} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
                <h4 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-2)' }}>No Active Coordinators</h4>
                <p style={{ color: 'var(--text-secondary)' }}>
                  There are currently no accounts with coordinator privileges.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordinators.map((coord) => (
                      <tr key={coord.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{coord.name || 'Coordinator'}</div>
                        </td>
                        <td>{coord.email}</td>
                        <td>
                          <span className="badge badge--coordinator" style={{ background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}>
                            {coord.role}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                            Active
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          {formatDate(coord.createdAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() => {
                              setCoordToRevoke(coord);
                              setRevokeReason('');
                            }}
                            title="Revoke Coordinator Access"
                          >
                            Revoke Privileges
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* Reject Event Modal */}
      {eventToReject && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>Reject Event Submission</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
              Rejecting "{eventToReject.title}" will remove it from consideration. You can provide feedback for the coordinator.
            </p>
            <div className="form-group">
              <label htmlFor="reject-note" className="form-label">Review Note (Optional)</label>
              <textarea
                id="reject-note"
                rows={3}
                className="form-input"
                placeholder="e.g. Please clarify ticket pricing and venue permit..."
                value={eventRejectNote}
                onChange={(e) => setEventRejectNote(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setEventToReject(null)} disabled={isRejectingEvent}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={handleRejectEventConfirm} disabled={isRejectingEvent}>
                {isRejectingEvent ? <SpinnerIcon size={16} /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Decision Modal */}
      {requestToReview && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
              {reviewAction === 'APPROVE' ? 'Approve Coordinator Request' : 'Reject Coordinator Request'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
              {reviewAction === 'APPROVE'
                ? `Granting coordinator privileges to ${requestToReview.userEmail} for "${requestToReview.organizationOrClub}".`
                : `Rejecting coordinator application from ${requestToReview.userEmail}.`}
            </p>
            <div className="form-group">
              <label htmlFor="request-review-note" className="form-label">Review Note (Optional)</label>
              <textarea
                id="request-review-note"
                rows={3}
                className="form-input"
                placeholder="Optional notes or feedback for the applicant..."
                value={requestReviewNote}
                onChange={(e) => setRequestReviewNote(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setRequestToReview(null)} disabled={isReviewingRequest}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${reviewAction === 'APPROVE' ? 'btn--primary' : 'btn--danger'}`}
                onClick={handleReviewRequestConfirm}
                disabled={isReviewingRequest}
              >
                {isReviewingRequest ? <SpinnerIcon size={16} /> : `Confirm ${reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Coordinator Modal */}
      {coordToRevoke && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)', color: '#f87171' }}>
              Revoke Coordinator Privileges
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
              Are you sure you want to revoke coordinator access for <strong>{coordToRevoke.email}</strong>?
              They will return to regular student status (<code style={{ color: 'var(--accent-cyan)' }}>ROLE_USER</code>) immediately.
              Their ability to create or manage events will be blocked on their very next API call.
            </p>
            <div className="form-group">
              <label htmlFor="revoke-reason" className="form-label">Reason for Revocation (Optional)</label>
              <textarea
                id="revoke-reason"
                rows={3}
                className="form-input"
                placeholder="e.g. Club leadership handover, graduation, policy issue..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
              <button type="button" className="btn btn--secondary" onClick={() => setCoordToRevoke(null)} disabled={isRevokingCoord}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={handleRevokeCoordinatorConfirm} disabled={isRevokingCoord}>
                {isRevokingCoord ? <SpinnerIcon size={16} /> : 'Revoke Privileges Immediately'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
