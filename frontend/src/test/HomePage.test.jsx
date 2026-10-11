import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import * as api from '../services/api';

describe('HomePage Component', () => {
  const sampleEvents = [
    {
      id: 1,
      title: 'Spring Hackathon 2026',
      description: 'Annual 48-hour hackathon for student developers.',
      eventType: 'HACKATHON',
      status: 'PUBLISHED',
      location: 'Tech Hub Arena',
      startDateTime: '2026-11-15T09:00:00',
      endDateTime: '2026-11-17T18:00:00',
      registrationDeadline: '2026-11-10T23:59:59',
      maxCapacity: 150,
      organizerName: 'Coding Society',
      contactEmail: 'code@campus.edu',
    },
    {
      id: 2,
      title: 'Docker & Kubernetes Workshop',
      description: 'Hands-on container orchestration workshop.',
      eventType: 'WORKSHOP',
      status: 'PUBLISHED',
      location: 'Computer Lab 3',
      startDateTime: '2026-11-20T10:00:00',
      endDateTime: '2026-11-20T16:00:00',
      registrationDeadline: '2026-11-18T23:59:59',
      maxCapacity: 60,
      organizerName: 'DevOps Club',
      contactEmail: 'devops@campus.edu',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderHomePage = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    );

  it('renders hero section and event cards when fetch succeeds', async () => {
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: false,
    });

    renderHomePage();

    // Verify hero and title
    expect(await screen.findByText('Spring Hackathon 2026')).toBeInTheDocument();
    expect(screen.getByText('Docker & Kubernetes Workshop')).toBeInTheDocument();
    expect(screen.getByText('2 events')).toBeInTheDocument();
  });

  it('filters events when searching in the search bar', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: false,
    });

    renderHomePage();

    expect(await screen.findByText('Spring Hackathon 2026')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search events by title/i);
    await user.type(searchInput, 'Kubernetes');

    expect(screen.getByText('Docker & Kubernetes Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Spring Hackathon 2026')).not.toBeInTheDocument();
  });

  it('filters events when clicking category filter chips', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: false,
    });

    renderHomePage();

    expect(await screen.findByText('Spring Hackathon 2026')).toBeInTheDocument();

    // Toggle filter panel to reveal chips
    const filterToggle = document.getElementById('filter-toggle');
    await user.click(filterToggle);

    // Click WORKSHOP filter chip
    const workshopChip = document.getElementById('filter-chip-workshop');
    await user.click(workshopChip);

    expect(screen.getByText('Docker & Kubernetes Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Spring Hackathon 2026')).not.toBeInTheDocument();
  });

  it('displays empty state when no events match the search filter', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: false,
    });

    renderHomePage();

    expect(await screen.findByText('Spring Hackathon 2026')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search events by title/i);
    await user.type(searchInput, 'NonExistentString123');

    expect(screen.getByText('No events found')).toBeInTheDocument();
    expect(screen.getByText(/No events match "NonExistentString123"/i)).toBeInTheDocument();
  });

  it('displays mock data notice when backend is unavailable and using mock fallback', async () => {
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: true,
    });

    renderHomePage();

    expect(await screen.findByText(/Using sample data — backend API is not running/i)).toBeInTheDocument();
  });

  it('displays error state with retry button when API rejects', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.spyOn(api, 'fetchEvents')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ events: sampleEvents, isMock: false });

    renderHomePage();

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Failed to load events. Please try again.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    await user.click(retryBtn);

    expect(await screen.findByText('Spring Hackathon 2026')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
