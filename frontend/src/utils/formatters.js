/**
 * Date and time formatting utilities for CampusPulse.
 */

/**
 * Formats a LocalDateTime string to a human-readable date.
 * @param {string} dateStr - ISO date string (e.g. "2026-11-15T09:00:00")
 * @returns {string} e.g. "Nov 15, 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a LocalDateTime string to a human-readable time.
 * @param {string} dateStr - ISO date string
 * @returns {string} e.g. "9:00 AM"
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date range for display.
 * @param {string} start - Start ISO date string
 * @param {string} end - End ISO date string
 * @returns {string} e.g. "Nov 15 – Nov 17, 2026"
 */
export function formatDateRange(start, end) {
  if (!start) return '';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const startFormatted = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (!endDate) return `${startFormatted}, ${startDate.getFullYear()}`;

  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return `${startFormatted}, ${startDate.getFullYear()}`;
  }

  const sameMonth = startDate.getMonth() === endDate.getMonth()
    && startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    return `${startFormatted} – ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }

  const endFormatted = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Returns a relative time string (e.g. "in 3 days", "2 hours ago").
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date - now;
  const absDiffMs = Math.abs(diffMs);

  const minutes = Math.floor(absDiffMs / (1000 * 60));
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));

  const prefix = diffMs > 0 ? 'in ' : '';
  const suffix = diffMs < 0 ? ' ago' : '';

  if (days > 0) return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`;
  if (hours > 0) return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${suffix}`;
  if (minutes > 0) return `${prefix}${minutes} min${minutes > 1 ? 's' : ''}${suffix}`;
  return 'just now';
}

/**
 * Returns an event type display label.
 * @param {string} eventType - Backend event type enum value
 * @returns {string} Human-readable label
 */
export function getEventTypeLabel(eventType) {
  const labels = {
    HACKATHON: 'Hackathon',
    WORKSHOP: 'Workshop',
    SEMINAR: 'Seminar',
    TECHNICAL: 'Technical',
    CULTURAL: 'Cultural',
    GUEST_LECTURE: 'Guest Lecture',
  };
  return labels[eventType] || eventType;
}

/**
 * Returns an event type emoji icon.
 * @param {string} eventType - Backend event type enum value
 * @returns {string} Emoji
 */
export function getEventTypeEmoji(eventType) {
  const emojis = {
    HACKATHON: '🚀',
    WORKSHOP: '🔧',
    SEMINAR: '🎓',
    TECHNICAL: '💻',
    CULTURAL: '🎭',
    GUEST_LECTURE: '🎤',
  };
  return emojis[eventType] || '📅';
}

/**
 * Returns an event status display label.
 * @param {string} status - Backend EventStatus enum value
 * @returns {string}
 */
export function getEventStatusLabel(status) {
  const labels = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    ONGOING: 'Ongoing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status || 'Draft';
}

/**
 * Converts a backend ISO LocalDateTime string to an HTML <input type="datetime-local"> value.
 * e.g. "2026-11-15T09:00:00" -> "2026-11-15T09:00"
 * @param {string} isoString
 * @returns {string}
 */
export function toDatetimeLocalValue(isoString) {
  if (!isoString) return '';
  // Handle formats like "2026-11-15T09:00:00" or Date objects
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts an HTML <input type="datetime-local"> value to an ISO LocalDateTime string
 * expected by Spring Boot Jackson deserializer.
 * e.g. "2026-11-15T09:00" -> "2026-11-15T09:00:00"
 * @param {string} localValue
 * @returns {string}
 */
export function toIsoDateTime(localValue) {
  if (!localValue) return null;
  // If already contains seconds, return as is
  if (localValue.length === 16) {
    return `${localValue}:00`;
  }
  return localValue;
}
