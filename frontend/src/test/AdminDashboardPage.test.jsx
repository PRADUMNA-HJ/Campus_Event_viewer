import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

describe('AdminDashboardPage Component', () => {
  const sampleEvents = [
    {
      id: 1,
      title: 'Spring Hackathon 2026',
      description: 'Annual hackathon event.',
      eventType: 'HACKATHON',
      status: 'PUBLISHED',
      location: 'Innovation Center',
      startDateTime: '2026-11-15T09:00:00',
      endDateTime: '2026-11-17T18:00:00',
      registrationDeadline: '2026-11-10T23:59:59',
      maxCapacity: 200,
      organizerName: 'Tech Society',
      contactEmail: 'tech@campus.edu',
    },
    {
      id: 2,
      title: 'React Workshop',
      description: 'Hands on React.',
      eventType: 'WORKSHOP',
      status: 'DRAFT',
      location: 'Lab 2',
      startDateTime: '2026-11-20T10:00:00',
      endDateTime: '2026-11-20T17:00:00',
      registrationDeadline: '2026-11-18T23:59:59',
      maxCapacity: 50,
      organizerName: 'Web Dev Club',
      contactEmail: 'web@campus.edu',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('campuspulse_admin_token', 'valid.token');
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'admin@campus.edu', role: 'ADMIN' })
    );
    vi.restoreAllMocks();

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 1,
      email: 'admin@campus.edu',
      role: 'ADMIN',
      createdAt: '2026-10-01T10:00:00',
    });
  });

  const renderDashboard = () =>
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  it('renders admin email, metrics, and event list', async () => {
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: false,
    });

    renderDashboard();

    expect(await screen.findByText('admin@campus.edu')).toBeInTheDocument();
    expect(screen.getByText('ROLE_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Spring Hackathon 2026')).toBeInTheDocument();
    expect(screen.getByText('React Workshop')).toBeInTheDocument();
    expect(screen.getByText('by Tech Society')).toBeInTheDocument();
  });

  it('filters events when searching in search bar', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: false,
    });

    renderDashboard();

    expect(await screen.findByText('Spring Hackathon 2026')).toBeInTheDocument();
    expect(screen.getByText('React Workshop')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search by title/i);
    await user.type(searchInput, 'React');

    expect(screen.queryByText('Spring Hackathon 2026')).not.toBeInTheDocument();
    expect(screen.getByText('React Workshop')).toBeInTheDocument();
  });

  it('confirms and deletes an event through the DeleteConfirmModal', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: sampleEvents,
      isMock: false,
    });

    vi.spyOn(api, 'deleteEvent').mockResolvedValue(true);

    renderDashboard();

    expect(await screen.findByText('Spring Hackathon 2026')).toBeInTheDocument();

    // Click delete on event #1
    const deleteBtn = screen.getByRole('button', { name: /Delete Spring Hackathon 2026/i });
    await user.click(deleteBtn);

    // Confirm modal should appear
    expect(screen.getByText(/Confirm destructive action/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    // Click delete in modal
    const confirmDeleteBtn = screen.getByRole('button', { name: /Delete Event/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteEvent).toHaveBeenCalledWith(1, 'valid.token');
      expect(screen.queryByText('Spring Hackathon 2026')).not.toBeInTheDocument();
      expect(screen.getByText(/has been deleted/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no events exist', async () => {
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({
      events: [],
      isMock: false,
    });

    renderDashboard();

    expect(await screen.findByText('No Events Found')).toBeInTheDocument();
    expect(screen.getByText(/Create First Event/i)).toBeInTheDocument();
  });

  it('displays error state with retry button when API fails', async () => {
    vi.spyOn(api, 'fetchEvents').mockRejectedValue(new Error('Database error'));

    renderDashboard();

    expect(await screen.findByText('Failed to Load Events')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Loading/i })).toBeInTheDocument();
  });
});
