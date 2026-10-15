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

  /* ===================================================================
     Regression Tests: Loading State, Empty/Populated Responses, & Stale Requests
     =================================================================== */

  it('stops loading and displays empty state when API resolves with a raw empty array []', async () => {
    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(document.getElementById('today-empty-state')).toBeInTheDocument();
    });

    // Loading skeleton must be completely cleared
    expect(document.getElementById('today-loading')).not.toBeInTheDocument();
    expect(screen.getByText('No events scheduled for today')).toBeInTheDocument();
  });

  it('stops loading and displays event sections when API resolves with a raw populated array', async () => {
    const rawEvents = [
      createEvent(101, 'Autonomous Drone Showcase', '2026-10-14T10:00:00', '2026-10-14T14:00:00'),
    ];
    vi.spyOn(api, 'fetchTodayEvents').mockResolvedValue(rawEvents);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Autonomous Drone Showcase')).toBeInTheDocument();
    });

    // Loading skeleton must be removed
    expect(document.getElementById('today-loading')).not.toBeInTheDocument();
    expect(document.getElementById('ongoing-section')).toHaveTextContent('Autonomous Drone Showcase');
  });

  it('clears loading skeleton on API failure, displays error with working retry button, and succeeds on retry', async () => {
    const retryEvent = [
      createEvent(202, 'Network Engineering Talk', '2026-10-14T10:00:00', '2026-10-14T14:00:00'),
    ];

    const fetchSpy = vi.spyOn(api, 'fetchTodayEvents')
      .mockRejectedValueOnce(new Error('Gateway Timeout 504'))
      .mockResolvedValueOnce({ events: retryEvent, isMock: false });

    renderPage();

    // Verify error state appears and loading skeleton is gone
    await waitFor(() => {
      expect(document.getElementById('today-error-state')).toBeInTheDocument();
    });
    expect(document.getElementById('today-loading')).not.toBeInTheDocument();
    expect(screen.getByText(/Gateway Timeout 504/i)).toBeInTheDocument();

    const retryBtn = document.getElementById('retry-btn');
    expect(retryBtn).toBeInTheDocument();

    // Click retry button
    await act(async () => {
      retryBtn.click();
    });

    // Verify recovery: loading cleared and event rendered
    await waitFor(() => {
      expect(screen.getByText('Network Engineering Talk')).toBeInTheDocument();
    });
    expect(document.getElementById('today-loading')).not.toBeInTheDocument();
    expect(document.getElementById('today-error-state')).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('discards stale requests when a newer retry completes before the older request', async () => {
    let resolveCall1;
    let rejectCall1;
    const call1Promise = new Promise((resolve, reject) => {
      resolveCall1 = resolve;
      rejectCall1 = reject;
    });

    const freshEvents = [
      createEvent(501, 'Fresh Live Hackathon', '2026-10-14T10:00:00', '2026-10-14T14:00:00'),
    ];

    let callCount = 0;
    vi.spyOn(api, 'fetchTodayEvents').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return call1Promise;
      }
      return Promise.resolve({ events: freshEvents, isMock: false });
    });

    renderPage();

    // While call 1 is pending, call 1 rejects to expose retry button
    await act(async () => {
      rejectCall1(new Error('Initial connection drop'));
    });

    await waitFor(() => {
      expect(document.getElementById('today-error-state')).toBeInTheDocument();
    });

    // Create a new deferred promise for Call 2 (retry)
    let resolveCall2;
    const call2Promise = new Promise((resolve) => {
      resolveCall2 = resolve;
    });

    // Override spy: Call 2 is slow, Call 3 will be fast
    vi.spyOn(api, 'fetchTodayEvents').mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return call2Promise;
      }
      return Promise.resolve({ events: freshEvents, isMock: false });
    });

    // User clicks retry
    const retryBtn = document.getElementById('retry-btn');
    await act(async () => {
      retryBtn.click();
    });

    // Now Call 2 is pending. Now suppose Call 1 (or another stale event) resolves late:
    await act(async () => {
      resolveCall2({ events: freshEvents, isMock: false });
    });

    await waitFor(() => {
      expect(screen.getByText('Fresh Live Hackathon')).toBeInTheDocument();
    });

    // Now resolve late call 1 or stale data
    await act(async () => {
      resolveCall1?.({ events: [createEvent(999, 'Old Ghost Event', '2026-10-14T10:00:00', '2026-10-14T14:00:00')] });
    });

    // Must NOT display Old Ghost Event
    expect(screen.queryByText('Old Ghost Event')).not.toBeInTheDocument();
    expect(screen.getByText('Fresh Live Hackathon')).toBeInTheDocument();
  });

  it('safely handles component unmount while request is in flight without error', async () => {
    let resolvePending;
    const pendingPromise = new Promise((resolve) => {
      resolvePending = resolve;
    });

    vi.spyOn(api, 'fetchTodayEvents').mockReturnValue(pendingPromise);

    const { unmount } = renderPage();
    expect(document.getElementById('today-loading')).toBeInTheDocument();

    // Unmount before request resolves
    unmount();

    // Settle promise after unmount
    await act(async () => {
      resolvePending({ events: [], isMock: false });
    });
  });

  it('stops loading and displays error state when API rejects with unexpected payload error', async () => {
    vi.spyOn(api, 'fetchTodayEvents').mockRejectedValue(
      new api.ApiError('Unexpected response payload format from events service.', 500)
    );

    renderPage();

    await waitFor(() => {
      expect(document.getElementById('today-error-state')).toBeInTheDocument();
    });

    expect(document.getElementById('today-loading')).not.toBeInTheDocument();
    expect(screen.getByText(/Unexpected response payload format from events service/i)).toBeInTheDocument();
    expect(document.getElementById('retry-btn')).toBeInTheDocument();
  });
});
