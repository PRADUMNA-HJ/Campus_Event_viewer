import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchEvents, deleteEvent, ApiError } from '../services/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {
  formatDate,
  formatTime,
  getEventTypeLabel,
  getEventTypeEmoji,
  getEventStatusLabel,
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
} from '../components/Icons';

/**
 * Admin Dashboard Page
 * 
 * Central administrator control hub for managing CampusPulse events.
 * Features KPI metrics, search & category filtering, and full Event CRUD workflows.
 */
export default function AdminDashboardPage() {
  const { user, token, logout } = useAuth();
  const location = useLocation();

  // Events list state
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Delete modal state
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [flashMessage, setFlashMessage] = useState(location.state?.flashMessage || null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Clear flash message when location changes or after 6 seconds
  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setFlashMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  // Load events
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

  useEffect(() => {
    loadEvents();
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Search
      const matchesSearch =
        !searchQuery.trim() ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizerName.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchesStatus =
        statusFilter === 'ALL' || event.status === statusFilter;

      // Type
      const matchesType =
        typeFilter === 'ALL' || event.eventType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [events, searchQuery, statusFilter, typeFilter]);

  // KPI calculations
  const stats = useMemo(() => {
    const total = events.length;
    const hackathons = events.filter((e) => e.eventType === 'HACKATHON').length;
    const workshops = events.filter((e) => e.eventType === 'WORKSHOP').length;
    const published = events.filter((e) => e.status === 'PUBLISHED').length;
    return { total, hackathons, workshops, published };
  }, [events]);

  // Handle Event Deletion
  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteEvent(eventToDelete.id, token);
      // Remove only after backend confirms deletion
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
                <option value="DRAFT">Draft</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
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

            <Link to="/admin/events/new" className="btn btn--primary" id="admin-create-event-btn">
              <PlusIcon size={16} />
              <span>Create Event</span>
            </Link>
          </div>
        </div>

        {/* Events Table Container */}
        <div className="admin-table-container">
          {isLoading ? (
            <div className="admin-table-loading" id="admin-table-loading">
              <SpinnerIcon size={32} />
              <p>Loading events from server...</p>
            </div>
          ) : error ? (
            <div className="admin-table-error" id="admin-table-error">
              <AlertCircleIcon size={32} className="error-icon" />
              <h3>Failed to Load Events</h3>
              <p>{error}</p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={loadEvents}
                id="admin-retry-load-btn"
              >
                Retry Loading
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="admin-table-empty" id="admin-table-empty">
              <div className="empty-icon">📅</div>
              <h3>No Events Found</h3>
              <p>
                {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'No events match your search or filter criteria. Try clearing filters.'
                  : 'Get started by publishing your campus platform\'s first event.'}
              </p>
              {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' ? (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setTypeFilter('ALL');
                  }}
                  id="admin-clear-filters-btn"
                >
                  Clear Filters
                </button>
              ) : (
                <Link to="/admin/events/new" className="btn btn--primary" id="admin-empty-create-btn">
                  <PlusIcon size={16} />
                  <span>Create First Event</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table" id="admin-events-table">
                <thead>
                  <tr>
                    <th>Title & Organizer</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id} id={`event-row-${evt.id}`}>
                      {/* Title & Organizer */}
                      <td>
                        <div className="table-event-title-cell">
                          <Link
                            to={`/events/${evt.id}`}
                            className="table-event-title"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View public event page"
                          >
                            <span>{evt.title}</span>
                            <ExternalLinkIcon size={12} className="title-link-icon" />
                          </Link>
                          <span className="table-event-organizer">by {evt.organizerName}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className={`badge badge--type badge--${evt.eventType.toLowerCase().replace('_', '-')}`}>
                          {getEventTypeEmoji(evt.eventType)} {getEventTypeLabel(evt.eventType)}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge badge--status badge--status-${(evt.status || 'draft').toLowerCase()}`}>
                          {getEventStatusLabel(evt.status)}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td>
                        <div className="table-date-cell">
                          <span className="table-date">{formatDate(evt.startDateTime)}</span>
                          <span className="table-time">{formatTime(evt.startDateTime)}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td>
                        <span className="table-location" title={evt.location}>
                          {evt.location}
                        </span>
                      </td>

                      {/* Capacity */}
                      <td>
                        <div className="table-capacity">
                          <UsersIcon size={14} />
                          <span>{evt.maxCapacity ? `${evt.maxCapacity} seats` : 'Unlimited'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="table-actions">
                          <Link
                            to={`/admin/events/${evt.id}/edit`}
                            className="action-btn action-btn--edit"
                            title="Edit Event"
                            aria-label={`Edit ${evt.title}`}
                            id={`edit-event-btn-${evt.id}`}
                          >
                            <EditIcon size={16} />
                          </Link>
                          <button
                            type="button"
                            className="action-btn action-btn--delete"
                            title="Delete Event"
                            aria-label={`Delete ${evt.title}`}
                            onClick={() => setEventToDelete(evt)}
                            id={`delete-event-btn-${evt.id}`}
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
