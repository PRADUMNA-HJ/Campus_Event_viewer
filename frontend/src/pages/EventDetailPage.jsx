import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchEventById } from '../services/api';
import {
  formatDate,
  formatTime,
  formatDateRange,
  getRelativeTime,
  getEventTypeLabel,
  getEventTypeEmoji,
} from '../utils/formatters';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  MailIcon,
  PhoneIcon,
  TagIcon,
} from '../components/Icons';

/**
 * Event detail page — Shows full event information.
 */
export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchEventById(id);
        if (!result.event) {
          setError('Event not found.');
        } else {
          setEvent(result.event);
          setIsMock(result.isMock);
        }
      } catch (err) {
        setError('Failed to load event details.');
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div className="event-detail container">
        <div style={{ paddingTop: 'var(--space-8)' }}>
          <div className="skeleton" style={{ width: '120px', height: '16px', marginBottom: 'var(--space-8)' }} />
          <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-8)' }} />
          <div className="skeleton" style={{ width: '200px', height: '20px', marginBottom: 'var(--space-3)' }} />
          <div className="skeleton" style={{ width: '60%', height: '36px', marginBottom: 'var(--space-6)' }} />
          <div className="skeleton" style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  // Error/Not found state
  if (error || !event) {
    return (
      <div className="event-detail container">
        <div className="error-state">
          <div className="error-state__icon">😕</div>
          <h3 className="error-state__title">{error || 'Event not found'}</h3>
          <p className="error-state__description">
            The event you're looking for doesn't exist or may have been removed.
          </p>
          <Link to="/" className="error-state__retry-btn">
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const emoji = getEventTypeEmoji(event.eventType);

  return (
    <div className="event-detail container" id="event-detail">
      {/* Back link */}
      <Link to="/" className="event-detail__back" id="back-link">
        <ArrowLeftIcon size={16} />
        Back to Events
      </Link>

      {/* Mock data notice */}
      {isMock && (
        <div style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--font-size-sm)',
          color: '#eab308',
        }}>
          ⚠️ Showing sample data — backend API is not running.
        </div>
      )}

      {/* Banner */}
      <div className="event-detail__banner" id="event-banner">
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt={`${event.title} banner`} />
        ) : (
          <div className="event-detail__banner-placeholder">{emoji}</div>
        )}
      </div>

      {/* Header */}
      <div className="event-detail__header" id="event-header">
        <div className="event-detail__badges">
          <span className={`event-card__badge event-card__badge--${event.eventType}`}>
            {getEventTypeLabel(event.eventType)}
          </span>
          <span className={`event-card__status event-card__status--${event.status}`}>
            {event.status}
          </span>
        </div>
        <h1 className="event-detail__title">{event.title}</h1>
      </div>

      {/* Content grid */}
      <div className="event-detail__grid">
        {/* Description */}
        <div>
          <div className="event-detail__info-card" style={{ marginBottom: 'var(--space-6)' }}>
            <h3>About this Event</h3>
            <p className="event-detail__description">{event.description}</p>
            {event.registrationUrl && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary"
                  id="event-register-cta-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                  Register for this Event &rarr;
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="event-detail__sidebar">
          {/* Date & Time */}
          <div className="event-detail__info-card" id="event-datetime-card">
            <h3>Date & Time</h3>
            <div className="event-detail__info-row">
              <CalendarIcon size={20} className="event-detail__info-icon" />
              <div>
                <div className="event-detail__info-label">Date</div>
                <div className="event-detail__info-value">
                  {formatDateRange(event.startDateTime, event.endDateTime)}
                </div>
              </div>
            </div>
            <div className="event-detail__info-row">
              <ClockIcon size={20} className="event-detail__info-icon" />
              <div>
                <div className="event-detail__info-label">Time</div>
                <div className="event-detail__info-value">
                  {formatTime(event.startDateTime)} — {formatTime(event.endDateTime)}
                </div>
              </div>
            </div>
            {event.registrationDeadline && (
              <div className="event-detail__info-row">
                <TagIcon size={20} className="event-detail__info-icon" />
                <div>
                  <div className="event-detail__info-label">Registration Deadline</div>
                  <div className="event-detail__info-value">
                    {formatDate(event.registrationDeadline)} ({getRelativeTime(event.registrationDeadline)})
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location & Capacity */}
          <div className="event-detail__info-card" id="event-location-card">
            <h3>Venue & Details</h3>
            {event.location && (
              <div className="event-detail__info-row">
                <MapPinIcon size={20} className="event-detail__info-icon" />
                <div>
                  <div className="event-detail__info-label">Location</div>
                  <div className="event-detail__info-value">{event.location}</div>
                </div>
              </div>
            )}
            {event.maxCapacity && (
              <div className="event-detail__info-row">
                <UsersIcon size={20} className="event-detail__info-icon" />
                <div>
                  <div className="event-detail__info-label">Capacity</div>
                  <div className="event-detail__info-value">{event.maxCapacity} attendees</div>
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="event-detail__info-card" id="event-contact-card">
            <h3>Contact & Organizer</h3>
            {event.organizerName && (
              <div className="event-detail__info-row">
                <UsersIcon size={20} className="event-detail__info-icon" />
                <div>
                  <div className="event-detail__info-label">Organized by</div>
                  <div className="event-detail__info-value">{event.organizerName}</div>
                </div>
              </div>
            )}
            {event.contactEmail && (
              <div className="event-detail__info-row">
                <MailIcon size={20} className="event-detail__info-icon" />
                <div>
                  <div className="event-detail__info-label">Email</div>
                  <div className="event-detail__info-value">
                    <a href={`mailto:${event.contactEmail}`} style={{ color: 'var(--accent-cyan)' }}>
                      {event.contactEmail}
                    </a>
                  </div>
                </div>
              </div>
            )}
            {event.whatsappNumber && (
              <div className="event-detail__info-row">
                <PhoneIcon size={20} className="event-detail__info-icon" />
                <div>
                  <div className="event-detail__info-label">WhatsApp</div>
                  <div className="event-detail__info-value">
                    <a
                      href={`https://wa.me/${event.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-green)' }}
                    >
                      {event.whatsappNumber}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
