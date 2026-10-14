import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '../components/EventCard';
import SkeletonCards from '../components/SkeletonCards';
import { fetchTodayEvents } from '../services/api';
import {
  formatFullDate,
  parseSafeDate,
  classifyEventTiming,
} from '../utils/formatters';

/**
 * Happening Today Page — Public display of events scheduled for the current calendar day.
 * Segmented into:
 * 1. Ongoing Now (active right now)
 * 2. Upcoming Today (starting later today, sorted chronologically)
 * 3. Completed Today (concluded earlier today)
 * 
 * Auto-refreshes classifications every 30 seconds without requiring a full page reload.
 */
export default function HappeningTodayPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const loadTodayEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTodayEvents();
      setEvents(result.events || []);
    } catch (err) {
      setError(err?.message || 'Failed to load today’s events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayEvents();
  }, [loadTodayEvents]);

  // Recalculate event classifications every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Classify events based on currentTime
  const { ongoingEvents, upcomingEvents, completedEvents, totalTodayEvents } = useMemo(() => {
    const ongoing = [];
    const upcoming = [];
    const completed = [];

    // Filter only published events that have valid dates
    for (const event of events) {
      if (event.status && event.status !== 'PUBLISHED') {
        continue;
      }

      const status = classifyEventTiming(event.startDateTime, event.endDateTime, currentTime);

      if (status === 'ONGOING') {
        ongoing.push(event);
      } else if (status === 'UPCOMING') {
        upcoming.push(event);
      } else if (status === 'COMPLETED') {
        completed.push(event);
      }
    }

    // Sort upcoming events chronologically by start time ascending
    upcoming.sort((a, b) => {
      const aStart = parseSafeDate(a.startDateTime)?.getTime() || 0;
      const bStart = parseSafeDate(b.startDateTime)?.getTime() || 0;
      return aStart - bStart;
    });

    // Sort ongoing events by start time ascending
    ongoing.sort((a, b) => {
      const aStart = parseSafeDate(a.startDateTime)?.getTime() || 0;
      const bStart = parseSafeDate(b.startDateTime)?.getTime() || 0;
      return aStart - bStart;
    });

    // Sort completed events with most recently ended first
    completed.sort((a, b) => {
      const aEnd = parseSafeDate(a.endDateTime)?.getTime() || 0;
      const bEnd = parseSafeDate(b.endDateTime)?.getTime() || 0;
      return bEnd - aEnd;
    });

    return {
      ongoingEvents: ongoing,
      upcomingEvents: upcoming,
      completedEvents: completed,
      totalTodayEvents: ongoing.length + upcoming.length + completed.length,
    };
  }, [events, currentTime]);

  return (
    <div className="happening-today container" id="happening-today-page">
      {/* Page Header */}
      <header className="happening-header">
        <div className="happening-header__content">
          <div className="happening-header__badge">
            <span className="live-dot" aria-hidden="true" />
            <span>LIVE SCHEDULE</span>
            <span className="happening-header__ticker">• Auto-refreshes every 30s</span>
          </div>
          <h1 className="happening-header__title">Happening Today</h1>
          <p className="happening-header__subtitle">
            {formatFullDate(currentTime)}
          </p>
        </div>

        {/* Quick summary stats */}
        {!loading && !error && (
          <div className="happening-stats">
            <a href="#ongoing-section" className="happening-stat happening-stat--ongoing">
              <span className="happening-stat__dot" />
              <span className="happening-stat__count">{ongoingEvents.length}</span>
              <span className="happening-stat__label">Ongoing Now</span>
            </a>
            <a href="#upcoming-section" className="happening-stat happening-stat--upcoming">
              <span className="happening-stat__count">{upcomingEvents.length}</span>
              <span className="happening-stat__label">Upcoming Today</span>
            </a>
            <a href="#completed-section" className="happening-stat happening-stat--completed">
              <span className="happening-stat__count">{completedEvents.length}</span>
              <span className="happening-stat__label">Completed Today</span>
            </a>
          </div>
        )}
      </header>

      {/* Loading state */}
      {loading && (
        <div className="events-grid" id="today-loading" style={{ marginTop: 'var(--space-8)' }}>
          <SkeletonCards count={6} />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="error-state" id="today-error-state">
          <div className="error-state__icon">⚠️</div>
          <h3 className="error-state__title">Failed to load today's events</h3>
          <p className="error-state__description">{error}</p>
          <button
            type="button"
            className="error-state__retry-btn"
            onClick={loadTodayEvents}
            id="retry-btn"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Complete empty state when 0 events for today */}
      {!loading && !error && totalTodayEvents === 0 && (
        <div className="empty-state" id="today-empty-state">
          <div className="empty-state__icon">📅</div>
          <h3 className="empty-state__title">No events scheduled for today</h3>
          <p className="empty-state__description">
            There are no campus events happening today. Check out our upcoming calendar to discover upcoming hackathons, workshops, and lectures!
          </p>
          <Link to="/" className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }}>
            Explore Upcoming Events &rarr;
          </Link>
        </div>
      )}

      {/* Sections rendering when events exist */}
      {!loading && !error && totalTodayEvents > 0 && (
        <div className="happening-sections">
          {/* Section 1: Ongoing Now */}
          <section className="happening-section" id="ongoing-section">
            <div className="happening-section__header">
              <div className="happening-section__title-group">
                <span className="live-dot live-dot--active" aria-hidden="true" />
                <h2 className="happening-section__title happening-section__title--ongoing">
                  Ongoing Now
                </h2>
              </div>
              <span className="happening-section__badge happening-section__badge--ongoing">
                {ongoingEvents.length} {ongoingEvents.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {ongoingEvents.length === 0 ? (
              <div className="happening-section__empty">
                <p>No events are happening right now. Check below for events starting later today!</p>
              </div>
            ) : (
              <div className="events-grid" id="ongoing-events-grid">
                {ongoingEvents.map((event, index) => (
                  <EventCard key={`ongoing-${event.id}`} event={event} index={index} />
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Upcoming Today */}
          <section className="happening-section" id="upcoming-section">
            <div className="happening-section__header">
              <div className="happening-section__title-group">
                <span className="section-icon" aria-hidden="true">⏰</span>
                <h2 className="happening-section__title happening-section__title--upcoming">
                  Upcoming Today
                </h2>
              </div>
              <span className="happening-section__badge happening-section__badge--upcoming">
                {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="happening-section__empty">
                <p>No more events scheduled to start today.</p>
              </div>
            ) : (
              <div className="events-grid" id="upcoming-events-grid">
                {upcomingEvents.map((event, index) => (
                  <EventCard key={`upcoming-${event.id}`} event={event} index={index} />
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Completed Today */}
          <section className="happening-section" id="completed-section">
            <div className="happening-section__header">
              <div className="happening-section__title-group">
                <span className="section-icon" aria-hidden="true">✅</span>
                <h2 className="happening-section__title happening-section__title--completed">
                  Completed Today
                </h2>
              </div>
              <span className="happening-section__badge happening-section__badge--completed">
                {completedEvents.length} {completedEvents.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {completedEvents.length === 0 ? (
              <div className="happening-section__empty">
                <p>No events have concluded yet today.</p>
              </div>
            ) : (
              <div className="events-grid happening-grid--completed" id="completed-events-grid">
                {completedEvents.map((event, index) => (
                  <EventCard key={`completed-${event.id}`} event={event} index={index} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
