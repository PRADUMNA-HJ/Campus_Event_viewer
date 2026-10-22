import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon, MapPinIcon, ArrowRightIcon } from './Icons';
import { formatDate, formatTime, getEventTypeEmoji } from '../utils/formatters';

/**
 * Event card for the events grid.
 * Displays event type badge, title, description, date, location, and organizer.
 */
export default function EventCard({ event, index = 0 }) {
  const {
    id,
    title,
    description,
    eventType,
    status,
    location,
    startDateTime,
    endDateTime,
    organizerName,
    bannerUrl,
    qrCodeUrl,
  } = event;

  const [imageError, setImageError] = useState(false);
  const emoji = getEventTypeEmoji(eventType);
  const initials = organizerName
    ? organizerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <Link
      to={`/events/${id}`}
      className="event-card"
      id={`event-card-${id}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Banner */}
      <div className="event-card__banner">
        {bannerUrl && !imageError ? (
          <img
            src={bannerUrl}
            alt={`${title} banner`}
            className="event-card__banner-img"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="event-card__banner-placeholder">{emoji}</div>
        )}
        <div className="event-card__banner-overlay" />

        {/* Type badge */}
        <span className={`event-card__badge event-card__badge--${eventType}`}>
          {eventType?.replace('_', ' ')}
        </span>

        {/* Status badge */}
        {status && status !== 'PUBLISHED' && (
          <span className={`event-card__status event-card__status--${status}`}>
            {status}
          </span>
        )}

        {/* QR Code Indicator */}
        {qrCodeUrl && (
          <span
            className="event-card__badge event-card__badge--qr"
            title="Scan QR Code Available"
            style={{
              position: 'absolute',
              bottom: 'var(--space-2)',
              right: 'var(--space-2)',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              color: '#ffffff',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              zIndex: 2,
            }}
          >
            📱 QR
          </span>
        )}
      </div>

      {/* Body */}
      <div className="event-card__body">
        <h3 className="event-card__title">{title}</h3>
        <p className="event-card__description">{description}</p>

        <div className="event-card__meta">
          <div className="event-card__meta-item">
            <CalendarIcon className="event-card__meta-icon" />
            <span>{formatDate(startDateTime)} • {formatTime(startDateTime)}</span>
          </div>
          {location && (
            <div className="event-card__meta-item">
              <MapPinIcon className="event-card__meta-icon" />
              <span>{location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="event-card__footer">
        <div className="event-card__organizer">
          <div className="event-card__organizer-avatar">{initials}</div>
          <span>{organizerName}</span>
        </div>
        <span className="event-card__view-btn">
          View <ArrowRightIcon />
        </span>
      </div>
    </Link>
  );
}
