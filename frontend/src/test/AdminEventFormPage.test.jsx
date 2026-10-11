import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminEventFormPage from '../pages/AdminEventFormPage';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

describe('AdminEventFormPage Component', () => {
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

  const renderCreateForm = () =>
    render(
      <MemoryRouter initialEntries={['/admin/events/new']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/events/new" element={<AdminEventFormPage />} />
            <Route path="/admin/dashboard" element={<div>Dashboard Destination</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  it('renders all required form fields matching EventCreateRequest', async () => {
    renderCreateForm();

    expect(screen.getByLabelText(/Event Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description & Agenda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Publication Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location \/ Venue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date & Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registration Deadline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organizer \/ Society Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish Event/i })).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    const submitBtn = screen.getByRole('button', { name: /Publish Event/i });
    await user.click(submitBtn);

    expect(screen.getByText('Event title is required.')).toBeInTheDocument();
    expect(screen.getByText('Event description is required.')).toBeInTheDocument();
    expect(screen.getByText('Location is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date and time are required.')).toBeInTheDocument();
    expect(screen.getByText('Organizer name is required.')).toBeInTheDocument();
    expect(screen.getByText('Contact email is required.')).toBeInTheDocument();
  });

  it('validates that endDateTime is after startDateTime', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.type(screen.getByLabelText(/Event Title/i), 'Hackathon Test');
    await user.type(screen.getByLabelText(/Description & Agenda/i), 'Description test');
    await user.type(screen.getByLabelText(/Location \/ Venue/i), 'Room 101');
    await user.type(screen.getByLabelText(/Organizer \/ Society Name/i), 'Tech Club');
    await user.type(screen.getByLabelText(/Contact Email/i), 'tech@campus.edu');

    // Set end earlier than start
    await user.type(screen.getByLabelText(/Start Date & Time/i), '2026-11-20T10:00');
    await user.type(screen.getByLabelText(/End Date & Time/i), '2026-11-19T10:00');
    await user.type(screen.getByLabelText(/Registration Deadline/i), '2026-11-15T10:00');

    await user.click(screen.getByRole('button', { name: /Publish Event/i }));

    expect(
      screen.getByText('End date and time must be after the start date and time.')
    ).toBeInTheDocument();
  });

  it('validates that registrationDeadline is not after startDateTime', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.type(screen.getByLabelText(/Event Title/i), 'Hackathon Test');
    await user.type(screen.getByLabelText(/Description & Agenda/i), 'Description test');
    await user.type(screen.getByLabelText(/Location \/ Venue/i), 'Room 101');
    await user.type(screen.getByLabelText(/Organizer \/ Society Name/i), 'Tech Club');
    await user.type(screen.getByLabelText(/Contact Email/i), 'tech@campus.edu');

    // Deadline after start
    await user.type(screen.getByLabelText(/Start Date & Time/i), '2026-11-20T10:00');
    await user.type(screen.getByLabelText(/End Date & Time/i), '2026-11-22T10:00');
    await user.type(screen.getByLabelText(/Registration Deadline/i), '2026-11-25T10:00');

    await user.click(screen.getByRole('button', { name: /Publish Event/i }));

    expect(
      screen.getByText('Registration deadline must not be after the event start date and time.')
    ).toBeInTheDocument();
  });

  it('submits valid form data and redirects to dashboard', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'createEvent').mockResolvedValue({
      id: 99,
      title: 'Valid Hackathon',
      eventType: 'HACKATHON',
    });

    renderCreateForm();

    await user.type(screen.getByLabelText(/Event Title/i), 'Valid Hackathon');
    await user.type(screen.getByLabelText(/Description & Agenda/i), 'Super awesome hackathon.');
    await user.type(screen.getByLabelText(/Location \/ Venue/i), 'Main Auditorium');
    await user.type(screen.getByLabelText(/Start Date & Time/i), '2026-11-20T10:00');
    await user.type(screen.getByLabelText(/End Date & Time/i), '2026-11-22T18:00');
    await user.type(screen.getByLabelText(/Registration Deadline/i), '2026-11-18T23:59');
    await user.type(screen.getByLabelText(/Organizer \/ Society Name/i), 'Coding Society');
    await user.type(screen.getByLabelText(/Contact Email/i), 'coder@campus.edu');

    await user.click(screen.getByRole('button', { name: /Publish Event/i }));

    await waitFor(() => {
      expect(api.createEvent).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Dashboard Destination')).toBeInTheDocument();
    });
  });

  it('populates fields in edit mode and updates event via PUT', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: {
        id: 42,
        title: 'Original Title',
        description: 'Original Description',
        eventType: 'WORKSHOP',
        status: 'PUBLISHED',
        location: 'Room 202',
        startDateTime: '2026-11-20T10:00:00',
        endDateTime: '2026-11-20T17:00:00',
        registrationDeadline: '2026-11-18T23:59:59',
        maxCapacity: 50,
        organizerName: 'Workshop Org',
        contactEmail: 'workshop@campus.edu',
        whatsappNumber: '+919999999999',
        bannerUrl: null,
      },
      isMock: false,
    });

    vi.spyOn(api, 'updateEvent').mockResolvedValue({
      id: 42,
      title: 'Original Title Updated',
    });

    render(
      <MemoryRouter initialEntries={['/admin/events/42/edit']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/events/:id/edit" element={<AdminEventFormPage />} />
            <Route path="/admin/dashboard" element={<div>Dashboard Destination</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify initial load
    expect(await screen.findByDisplayValue('Original Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Room 202')).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Event Title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Original Title Updated');

    await user.click(screen.getByRole('button', { name: /Update Event/i }));

    await waitFor(() => {
      expect(api.updateEvent).toHaveBeenCalledTimes(1);
      expect(api.updateEvent.mock.calls[0][0]).toBe('42');
      expect(screen.getByText('Dashboard Destination')).toBeInTheDocument();
    });
  });
});
