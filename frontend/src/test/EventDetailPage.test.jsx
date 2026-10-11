import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EventDetailPage from '../pages/EventDetailPage';
import * as api from '../services/api';

describe('EventDetailPage Component', () => {
  const sampleEvent = {
    id: 10,
    title: 'Autonomous Robotics Hackathon 2026',
    description: 'Build and deploy autonomous mobile robots over 48 intensive hours.',
    eventType: 'HACKATHON',
    status: 'PUBLISHED',
    location: 'Robotics Workshop Hall B',
    startDateTime: '2026-11-15T09:00:00',
    endDateTime: '2026-11-17T18:00:00',
    registrationDeadline: '2026-11-10T23:59:59',
    maxCapacity: 120,
    organizerName: 'Robotics Society',
    contactEmail: 'robotics@campus.edu',
    whatsappNumber: '+919876543210',
    bannerUrl: 'https://example.com/banner.jpg',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderDetailPage = (eventId = '10') =>
    render(
      <MemoryRouter initialEntries={[`/events/${eventId}`]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/" element={<div>Home Page Destination</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders complete event details, dates, venue, and contact information', async () => {
    vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: sampleEvent,
      isMock: false,
    });

    renderDetailPage('10');

    expect(await screen.findByText('Autonomous Robotics Hackathon 2026')).toBeInTheDocument();
    expect(screen.getByText(/Build and deploy autonomous mobile robots/i)).toBeInTheDocument();
    expect(screen.getByText('Robotics Workshop Hall B')).toBeInTheDocument();
    expect(screen.getByText('120 attendees')).toBeInTheDocument();
    expect(screen.getByText('Robotics Society')).toBeInTheDocument();
    expect(screen.getByText('robotics@campus.edu')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();

    // Verify WhatsApp link has safe external link behavior
    const waLink = screen.getByRole('link', { name: '+919876543210' });
    expect(waLink).toHaveAttribute('target', '_blank');
    expect(waLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(waLink).toHaveAttribute('href', 'https://wa.me/919876543210');

    // Verify back link
    expect(screen.getByRole('link', { name: /Back to Events/i })).toBeInTheDocument();
  });

  it('displays error / not found state when event does not exist (404)', async () => {
    vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: null,
      isMock: false,
    });

    renderDetailPage('999');

    expect(await screen.findByText('Event not found.')).toBeInTheDocument();
    expect(screen.getByText(/The event you're looking for doesn't exist/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Events/i })).toBeInTheDocument();
  });

  it('displays mock data banner when falling back to mock data', async () => {
    vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: sampleEvent,
      isMock: true,
    });

    renderDetailPage('10');

    expect(await screen.findByText(/Showing sample data — backend API is not running/i)).toBeInTheDocument();
  });

  it('displays error state when API throws network exception', async () => {
    vi.spyOn(api, 'fetchEventById').mockRejectedValue(new Error('Connection timed out'));

    renderDetailPage('10');

    expect(await screen.findByText('Failed to load event details.')).toBeInTheDocument();
  });
});
