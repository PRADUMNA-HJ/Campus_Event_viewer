import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HappeningTodayPage from '../pages/HappeningTodayPage';
import * as api from '../services/api';

describe('HappeningTodayPage Component', () => {
  // Use a fixed reference time: Oct 14, 2026 at 12:00:00 PM local time
  const referenceNow = new Date('2026-10-14T12:00:00');

  const createEvent = (id, title, start, end, status = 'PUBLISHED', type = 'WORKSHOP') => ({
    id,
    title,
    description: `Description for ${title}`,
    eventType: type,
    status,
    location: 'Campus Hall B',
    startDateTime: start,
    endDateTime: end,
    organizerName: 'Engineering Club',
    bannerUrl: null,
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(referenceNow);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/today']}>
        <HappeningTodayPage />
      </MemoryRouter>
    );

  it('separates events into Ongoing Now, Upcoming Today, and Completed Today sections', async () => {
    const events = [
      // Ongoing: 10:00 AM to 2:00 PM (currently 12:00 PM)
      createEvent(1, 'AI & Robotics Hands-on Lab', '2026-10-14T10:00:00', '2026-10-14T14:00:00', 'PUBLISHED', 'TECHNICAL'),
      // Upcoming: 3:00 PM to 5:00 PM
      createEvent(2, 'Cloud Architecture Keynote', '2026-10-14T15:00:00', '2026-10-14T17:00:00', 'PUBLISHED', 'SEMINAR'),
      // Completed: 8:00 AM to 11:00 AM
      createEvent(3, 'Morning Career Fair & Breakfast', '2026-10-14T08:00:00', '2026-10-14T11:00:00', 'PUBLISHED', 'WORKSHOP'),
    ];

    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue({ events, isMock: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('AI & Robotics Hands-on Lab')).toBeInTheDocument();
    });

    // Check ongoing section contains the ongoing event
    const ongoingSection = document.getElementById('ongoing-section');
    expect(ongoingSection).toBeInTheDocument();
    expect(ongoingSection).toHaveTextContent('AI & Robotics Hands-on Lab');

    // Check upcoming section contains the upcoming event
    const upcomingSection = document.getElementById('upcoming-section');
    expect(upcomingSection).toBeInTheDocument();
    expect(upcomingSection).toHaveTextContent('Cloud Architecture Keynote');

    // Check completed section contains the completed event
    const completedSection = document.getElementById('completed-section');
    expect(completedSection).toBeInTheDocument();
    expect(completedSection).toHaveTextContent('Morning Career Fair & Breakfast');
  });

  it('sorts upcoming events chronologically by start time ascending', async () => {
    const events = [
      createEvent(1, 'Evening Social', '2026-10-14T19:00:00', '2026-10-14T21:00:00'),
      createEvent(2, 'Afternoon Tech Talk', '2026-10-14T14:00:00', '2026-10-14T15:30:00'),
      createEvent(3, 'Tea & Code Session', '2026-10-14T16:00:00', '2026-10-14T17:00:00'),
    ];

    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue({ events, isMock: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Afternoon Tech Talk')).toBeInTheDocument();
    });

    const upcomingGrid = document.getElementById('upcoming-events-grid');
    const titles = Array.from(upcomingGrid.querySelectorAll('.event-card__title')).map(el => el.textContent);

    expect(titles).toEqual([
      'Afternoon Tech Talk',
      'Tea & Code Session',
      'Evening Social',
    ]);
  });

  it('correctly handles midnight-crossing and multi-day events', async () => {
    const events = [
      // Multi-day hackathon spanning yesterday through tomorrow
      createEvent(1, 'Fall Hackathon 48H', '2026-10-13T10:00:00', '2026-10-15T10:00:00'),
      // Midnight crossing: starts tonight at 10 PM, ends tomorrow at 4 AM
      createEvent(2, 'Overnight Stargazing Meet', '2026-10-14T22:00:00', '2026-10-15T04:00:00'),
      // Event ended yesterday (out of day)
      createEvent(3, 'Yesterday Workshop', '2026-10-13T09:00:00', '2026-10-13T17:00:00'),
      // Event starts tomorrow (out of day)
      createEvent(4, 'Tomorrow Conference', '2026-10-15T09:00:00', '2026-10-15T17:00:00'),
    ];

    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue({ events, isMock: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Fall Hackathon 48H')).toBeInTheDocument();
    });

    // Multi-day event is ongoing now
    const ongoingSection = document.getElementById('ongoing-section');
    expect(ongoingSection).toHaveTextContent('Fall Hackathon 48H');

    // Midnight crossing starting tonight is upcoming today
    const upcomingSection = document.getElementById('upcoming-section');
    expect(upcomingSection).toHaveTextContent('Overnight Stargazing Meet');

    // Out of day events are not in today's sections
    expect(screen.queryByText('Yesterday Workshop')).not.toBeInTheDocument();
    expect(screen.queryByText('Tomorrow Conference')).not.toBeInTheDocument();
  });

  it('safely handles missing, null, or malformed dates without crashing', async () => {
    const events = [
      createEvent(1, 'Valid Ongoing Event', '2026-10-14T10:00:00', '2026-10-14T15:00:00'),
      {
        id: 2,
        title: 'Broken Date Event 1',
        startDateTime: null,
        endDateTime: null,
        status: 'PUBLISHED',
      },
      {
        id: 3,
        title: 'Broken Date Event 2',
        startDateTime: 'not-a-real-date',
        endDateTime: 'invalid-string',
        status: 'PUBLISHED',
      },
    ];

    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue({ events, isMock: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Valid Ongoing Event')).toBeInTheDocument();
    });

    // The component remains rendered and intact
    expect(screen.getByText('Happening Today')).toBeInTheDocument();
    expect(screen.queryByText('Broken Date Event 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Broken Date Event 2')).not.toBeInTheDocument();
  });

  it('filters out draft, pending review, and rejected events', async () => {
    const events = [
      createEvent(1, 'Live Published Event', '2026-10-14T10:00:00', '2026-10-14T14:00:00', 'PUBLISHED'),
      createEvent(2, 'Draft Event', '2026-10-14T10:00:00', '2026-10-14T14:00:00', 'DRAFT'),
      createEvent(3, 'Pending Review Event', '2026-10-14T10:00:00', '2026-10-14T14:00:00', 'PENDING_REVIEW'),
      createEvent(4, 'Rejected Event', '2026-10-14T10:00:00', '2026-10-14T14:00:00', 'REJECTED'),
    ];

    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue({ events, isMock: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Live Published Event')).toBeInTheDocument();
    });

    expect(screen.queryByText('Draft Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Review Event')).not.toBeInTheDocument();
    expect(screen.queryByText('Rejected Event')).not.toBeInTheDocument();
  });

  it('displays empty state when no events are scheduled for today', async () => {
    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue({ events: [], isMock: false });

    renderPage();

    await waitFor(() => {
      expect(document.getElementById('today-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('No events scheduled for today')).toBeInTheDocument();
    expect(screen.getByText(/Explore Upcoming Events/i)).toBeInTheDocument();
  });

  it('displays error state with working retry button on API failure and never falls back to mock events', async () => {
    const mockEvents = [
      createEvent(99, 'Real Live Event', '2026-10-14T10:00:00', '2026-10-14T14:00:00'),
    ];

    const fetchSpy = vi.spyOn(api, 'fetchTodayEvents')
      .mockRejectedValueOnce(new Error('Connection refused: Backend server is offline'))
      .mockResolvedValueOnce({ events: mockEvents, isMock: false });

    renderPage();

    await waitFor(() => {
      expect(document.getElementById('today-error-state')).toBeInTheDocument();
    });

    // Error message is displayed
    expect(screen.getByText(/Connection refused: Backend server is offline/i)).toBeInTheDocument();
    // NEVER shows mock events when error occurs
    expect(screen.queryByText('Spring Hackathon 2026')).not.toBeInTheDocument();

    // Click retry
    const retryBtn = document.getElementById('retry-btn');
    await act(async () => {
      retryBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Real Live Event')).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('dynamically transitions an upcoming event to ongoing when the 30s timer elapses past start time', async () => {
    // Current time is 11:59:30 AM
    vi.setSystemTime(new Date('2026-10-14T11:59:30'));

    // Event starts in 20 seconds at 11:59:50 AM, ends at 1:00 PM
    const events = [
      createEvent(1, 'Flash Workshop', '2026-10-14T11:59:50', '2026-10-14T13:00:00'),
    ];

    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue({ events, isMock: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Flash Workshop')).toBeInTheDocument();
    });

    // Initially at 11:59:30, the event is upcoming
    expect(document.getElementById('upcoming-section')).toHaveTextContent('Flash Workshop');
    expect(document.getElementById('ongoing-section')).not.toHaveTextContent('Flash Workshop');

    // Advance fake timer by 30 seconds (time becomes 12:00:00 PM)
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    // At 12:00:00 PM, the event has started (11:59:50 <= 12:00:00 < 13:00:00)
    // It should now automatically be in Ongoing Now without page reload!
    expect(document.getElementById('ongoing-section')).toHaveTextContent('Flash Workshop');
    expect(document.getElementById('upcoming-section')).not.toHaveTextContent('Flash Workshop');
  });
});
