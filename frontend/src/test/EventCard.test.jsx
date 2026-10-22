import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventCard from '../components/EventCard';

describe('EventCard Component', () => {
  const baseEvent = {
    id: 1,
    title: 'CodeSprint 2026',
    description: 'An exciting coding competition.',
    eventType: 'HACKATHON',
    status: 'PUBLISHED',
    location: 'Auditorium Hall',
    startDateTime: '2026-11-20T10:00:00',
    endDateTime: '2026-11-20T18:00:00',
    organizerName: 'Computer Society',
    bannerUrl: 'https://example.com/banner.jpg',
    qrCodeUrl: 'https://example.com/qr.png',
  };

  const renderCard = (event) =>
    render(
      <MemoryRouter>
        <EventCard event={event} />
      </MemoryRouter>
    );

  it('renders event banner image and QR badge when both are present', () => {
    renderCard(baseEvent);

    const bannerImg = screen.getByRole('img', { name: /CodeSprint 2026 banner/i });
    expect(bannerImg).toBeInTheDocument();
    expect(bannerImg).toHaveAttribute('src', 'https://example.com/banner.jpg');

    const qrBadge = screen.getByTitle('Scan QR Code Available');
    expect(qrBadge).toBeInTheDocument();
  });

  it('renders fallback emoji when bannerUrl is null or empty', () => {
    const eventWithoutBanner = { ...baseEvent, bannerUrl: null, qrCodeUrl: null };
    renderCard(eventWithoutBanner);

    expect(screen.queryByRole('img', { name: /CodeSprint 2026 banner/i })).not.toBeInTheDocument();
    // Default emoji placeholder should be visible for HACKATHON
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.queryByTitle('Scan QR Code Available')).not.toBeInTheDocument();
  });

  it('falls back to emoji placeholder when banner image fails to load (onError)', () => {
    renderCard(baseEvent);

    const bannerImg = screen.getByRole('img', { name: /CodeSprint 2026 banner/i });
    expect(bannerImg).toBeInTheDocument();

    // Trigger image error
    fireEvent.error(bannerImg);

    // Banner image should now be replaced by placeholder emoji
    expect(screen.queryByRole('img', { name: /CodeSprint 2026 banner/i })).not.toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('renders correct link to event details and displays organizer', () => {
    renderCard(baseEvent);

    const cardLink = screen.getByRole('link', { name: /CodeSprint 2026/i });
    expect(cardLink).toHaveAttribute('href', '/events/1');
    expect(screen.getByText('Computer Society')).toBeInTheDocument();
    expect(screen.getByText('Auditorium Hall')).toBeInTheDocument();
  });
});
