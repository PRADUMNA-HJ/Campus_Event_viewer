import { useState } from 'react';
import { SearchIcon, FilterIcon } from './Icons';
import { getEventTypeLabel } from '../utils/formatters';

const EVENT_TYPES = ['ALL', 'HACKATHON', 'WORKSHOP', 'SEMINAR', 'TECHNICAL', 'CULTURAL', 'GUEST_LECTURE'];

/**
 * Search and filter bar for event discovery.
 */
export default function SearchFilterBar({ searchQuery, onSearchChange, activeFilter, onFilterChange }) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="search-bar" id="search-bar">
      <div className="container">
        <div className="search-bar__inner">
          <SearchIcon size={20} className="search-bar__icon" />
          <input
            type="text"
            className="search-bar__input"
            placeholder="Search events by title, organizer, or location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            id="search-input"
          />
          <div className="search-bar__filters">
            <button
              className={`search-bar__filter-btn ${showFilters ? 'search-bar__filter-btn--active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              id="filter-toggle"
            >
              <FilterIcon size={14} />
              Filter
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-chips" style={{ marginTop: 'var(--space-4)' }} id="filter-chips">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                className={`filter-chip ${activeFilter === type ? 'filter-chip--active' : ''}`}
                onClick={() => onFilterChange(type)}
                id={`filter-chip-${type.toLowerCase()}`}
              >
                {type === 'ALL' ? '✨ All Events' : getEventTypeLabel(type)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
