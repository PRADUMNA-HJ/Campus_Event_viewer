import { useState, useEffect, useMemo } from 'react';
import Hero from '../components/Hero';
import SearchFilterBar from '../components/SearchFilterBar';
import EventCard from '../components/EventCard';
import SkeletonCards from '../components/SkeletonCards';
import { fetchEvents } from '../services/api';

/**
 * Home page — Public event discovery.
 * Displays hero, search/filter bar, and event cards grid.
 */
export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEvents();
      setEvents(result.events);
      setIsMock(result.isMock);
    } catch (err) {
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Client-side filtering and search
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by event type
    if (activeFilter !== 'ALL') {
      result = result.filter(e => e.eventType === activeFilter);
    }

    // Search by title, organizer, location, or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title?.toLowerCase().includes(query) ||
        e.organizerName?.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [events, activeFilter, searchQuery]);

  return (
    <>
      <Hero eventCount={events.length} />

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <section className="events-section container" id="events-section">
        <div className="events-section__header">
          <h2 className="events-section__title">
            {activeFilter === 'ALL' ? 'Upcoming Events' : `${activeFilter.replace('_', ' ')} Events`}
          </h2>
          <span className="events-section__count">
            {!loading && `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Mock data banner */}
        {isMock && !loading && (
          <div style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--font-size-sm)',
            color: '#eab308',
          }}>
            ⚠️ Using sample data — backend API is not running. Start the Spring Boot backend to see live events.
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="events-grid" id="events-grid-loading">
            <SkeletonCards count={6} />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="error-state" id="error-state">
            <div className="error-state__icon">⚠️</div>
            <h3 className="error-state__title">Something went wrong</h3>
            <p className="error-state__description">{error}</p>
            <button className="error-state__retry-btn" onClick={loadEvents} id="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredEvents.length === 0 && (
          <div className="empty-state" id="empty-state">
            <div className="empty-state__icon">🔍</div>
            <h3 className="empty-state__title">No events found</h3>
            <p className="empty-state__description">
              {searchQuery
                ? `No events match "${searchQuery}". Try a different search term.`
                : 'No upcoming events at the moment. Check back soon!'}
            </p>
          </div>
        )}

        {/* Events grid */}
        {!loading && !error && filteredEvents.length > 0 && (
          <div className="events-grid" id="events-grid">
            {filteredEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
