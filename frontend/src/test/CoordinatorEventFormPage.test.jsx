import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CoordinatorEventFormPage from '../pages/CoordinatorEventFormPage';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

/**
 * Tests for CoordinatorEventFormPage.
 *
 * Key regression guarded by these tests:
 *   - fetchEventById MUST receive the auth token so the backend can serve
 *     non-published events (PENDING_REVIEW, REJECTED) to their owning coordinator.
 */
describe('CoordinatorEventFormPage Component', () => {
  const COORD_TOKEN = 'coord.jwt.token';

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('campuspulse_admin_token', COORD_TOKEN);
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'coord@campus.edu', role: 'COORDINATOR', name: 'Test Coord' })
    );
    vi.restoreAllMocks();

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 11,
      email: 'coord@campus.edu',
      name: 'Test Coord',
      role: 'COORDINATOR',
      active: true,
      lastLoginAt: '2026-10-18T10:00:00Z',
    });
  });

  const renderCreateForm = () =>
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/coordinator/events/new']}>
          <Routes>
            <Route path="/coordinator/events/new" element={<CoordinatorEventFormPage />} />
            <Route path="/coordinator/dashboard" element={<div>Coordinator Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

  const renderEditForm = (id = '42') =>
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[`/coordinator/events/${id}/edit`]}>
          <Routes>
            <Route path="/coordinator/events/:id/edit" element={<CoordinatorEventFormPage />} />
            <Route path="/coordinator/dashboard" element={<div>Coordinator Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

  // -----------------------------------------------------------------------
  // Create mode tests
  // -----------------------------------------------------------------------

  it('renders the create event form with all required fields', () => {
    renderCreateForm();

    expect(screen.getByRole('heading', { name: /Create Campus Event/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organizer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Email/i)).toBeInTheDocument();
    // Coordinators must not have a status selector - events always go to PENDING_REVIEW
    expect(screen.queryByLabelText(/Publication Status/i)).not.toBeInTheDocument();
  });

  it('validates required fields and prevents submission when form is empty', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    // Clear prefilled fields from logged-in user
    await user.clear(screen.getByLabelText(/Organizer/i));
    await user.clear(screen.getByLabelText(/Contact Email/i));

    const submitBtn = screen.getByRole('button', { name: /Submit for Review/i });
    await user.click(submitBtn);

    expect(screen.getByText('Event title is required.')).toBeInTheDocument();
    expect(screen.getByText('Event description is required.')).toBeInTheDocument();
    expect(screen.getByText('Location or venue is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date and time are required.')).toBeInTheDocument();
    expect(screen.getByText('Organizer name is required.')).toBeInTheDocument();
    expect(screen.getByText('Contact email is required.')).toBeInTheDocument();
  });

  it('submits a valid new event and redirects to coordinator dashboard with flash message', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'createEvent').mockResolvedValue({
      id: 101,
      title: 'Spring Coding Night',
      status: 'PENDING_REVIEW',
    });

    renderCreateForm();

    await user.type(screen.getByLabelText(/Event Title/i), 'Spring Coding Night');
    await user.type(screen.getByLabelText(/Description/i), 'An all-night coding session.');
    await user.type(screen.getByLabelText(/Location/i), 'Lab 203');
    await user.type(screen.getByLabelText(/Start Date/i), '2026-11-25T18:00');
    await user.type(screen.getByLabelText(/End Date/i), '2026-11-26T06:00');
    await user.type(screen.getByLabelText(/Registration Deadline/i), '2026-11-23T23:59');
    await user.clear(screen.getByLabelText(/Organizer/i));
    await user.type(screen.getByLabelText(/Organizer/i), 'Coding Club');
    await user.clear(screen.getByLabelText(/Contact Email/i));
    await user.type(screen.getByLabelText(/Contact Email/i), 'codingclub@campus.edu');

    await user.click(screen.getByRole('button', { name: /Submit for Review/i }));

    await waitFor(() => {
      expect(api.createEvent).toHaveBeenCalledTimes(1);
      // Token must be passed as the second argument to createEvent
      expect(api.createEvent.mock.calls[0][1]).toBe(COORD_TOKEN);
      expect(screen.getByText('Coordinator Dashboard')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Edit mode - token propagation regression tests
  // -----------------------------------------------------------------------

  it('passes the auth token to fetchEventById when loading a PUBLISHED event for editing', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: {
        id: 50,
        title: 'Published Workshop',
        description: 'A great workshop.',
        eventType: 'WORKSHOP',
        status: 'PUBLISHED',
        location: 'Room 101',
        startDateTime: '2026-12-01T09:00:00',
        endDateTime: '2026-12-01T17:00:00',
        registrationDeadline: '2026-11-28T23:59:59',
        maxCapacity: 30,
        organizerName: 'Test Coord',
        contactEmail: 'coord@campus.edu',
        whatsappNumber: null,
        bannerUrl: null,
        registrationUrl: null,
      },
      isMock: false,
    });

    renderEditForm('50');

    expect(await screen.findByDisplayValue('Published Workshop')).toBeInTheDocument();

    // CRITICAL: verify fetchEventById was called with the coordinator JWT token
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('50', COORD_TOKEN);
  });

  it('passes the auth token to fetchEventById when loading a PENDING_REVIEW event for editing', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: {
        id: 55,
        title: 'Pending Hackathon',
        description: 'Awaiting admin approval.',
        eventType: 'HACKATHON',
        status: 'PENDING_REVIEW',
        location: 'Innovation Hub',
        startDateTime: '2026-12-10T10:00:00',
        endDateTime: '2026-12-12T18:00:00',
        registrationDeadline: '2026-12-08T23:59:59',
        maxCapacity: 200,
        organizerName: 'Test Coord',
        contactEmail: 'coord@campus.edu',
        whatsappNumber: null,
        bannerUrl: null,
        registrationUrl: null,
      },
      isMock: false,
    });

    renderEditForm('55');

    expect(await screen.findByDisplayValue('Pending Hackathon')).toBeInTheDocument();

    // Token is required so the backend can authorize the coordinator to view their own PENDING_REVIEW event
    expect(fetchSpy).toHaveBeenCalledWith('55', COORD_TOKEN);
  });

  it('passes the auth token to fetchEventById when loading a REJECTED event for editing', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: {
        id: 60,
        title: 'Rejected Seminar',
        description: 'Was rejected; coordinator fixes and resubmits.',
        eventType: 'SEMINAR',
        status: 'REJECTED',
        location: 'Auditorium',
        startDateTime: '2026-12-15T14:00:00',
        endDateTime: '2026-12-15T17:00:00',
        registrationDeadline: '2026-12-13T23:59:59',
        maxCapacity: null,
        organizerName: 'Test Coord',
        contactEmail: 'coord@campus.edu',
        whatsappNumber: null,
        bannerUrl: null,
        registrationUrl: null,
        reviewNote: 'Please provide more details about the speaker.',
      },
      isMock: false,
    });

    renderEditForm('60');

    expect(await screen.findByDisplayValue('Rejected Seminar')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith('60', COORD_TOKEN);
  });

  it('populates all editable form fields correctly from the loaded event', async () => {
    vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: {
        id: 50,
        title: 'Full Data Workshop',
        description: 'Comprehensive workshop description.',
        eventType: 'WORKSHOP',
        status: 'PUBLISHED',
        location: 'Room 303',
        startDateTime: '2026-12-05T10:00:00',
        endDateTime: '2026-12-05T16:00:00',
        registrationDeadline: '2026-12-03T23:59:59',
        maxCapacity: 50,
        organizerName: 'Robotics Club',
        contactEmail: 'robotics@campus.edu',
        whatsappNumber: '+919876543210',
        bannerUrl: 'https://example.com/banner.png',
        registrationUrl: 'https://forms.example.com/register',
      },
      isMock: false,
    });

    renderEditForm('50');

    expect(await screen.findByDisplayValue('Full Data Workshop')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Comprehensive workshop description.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Room 303')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Robotics Club')).toBeInTheDocument();
    expect(screen.getByDisplayValue('robotics@campus.edu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+919876543210')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('displays an access denied error when backend returns 403 on event load', async () => {
    vi.spyOn(api, 'fetchEventById').mockRejectedValue(
      new api.ApiError('Forbidden: not your event', 403)
    );

    renderEditForm('99');

    expect(
      await screen.findByText('Access denied: You can only edit events you created.')
    ).toBeInTheDocument();
  });

  it('displays a generic load error when backend returns 500', async () => {
    vi.spyOn(api, 'fetchEventById').mockRejectedValue(
      new api.ApiError('Internal Server Error', 500)
    );

    renderEditForm('99');

    expect(
      await screen.findByText(/Failed to load event for editing/i)
    ).toBeInTheDocument();
  });

  it('shows event-not-found message when fetchEventById resolves with null event', async () => {
    vi.spyOn(api, 'fetchEventById').mockResolvedValue({ event: null, isMock: false });

    renderEditForm('9999');

    expect(
      await screen.findByText('Event not found or you do not have permission to edit it.')
    ).toBeInTheDocument();
  });

  it('passes the coordinator token to updateEvent on successful edit submission', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'fetchEventById').mockResolvedValue({
      event: {
        id: 50,
        title: 'Workshop To Update',
        description: 'Old description.',
        eventType: 'WORKSHOP',
        status: 'PENDING_REVIEW',
        location: 'Lab A',
        startDateTime: '2026-12-10T10:00:00',
        endDateTime: '2026-12-10T17:00:00',
        registrationDeadline: '2026-12-08T23:59:59',
        maxCapacity: 30,
        organizerName: 'Test Coord',
        contactEmail: 'coord@campus.edu',
        whatsappNumber: null,
        bannerUrl: null,
        registrationUrl: null,
      },
      isMock: false,
    });

    vi.spyOn(api, 'updateEvent').mockResolvedValue({ id: 50, title: 'Workshop To Update' });

    renderEditForm('50');

    expect(await screen.findByDisplayValue('Workshop To Update')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Update & Submit for Review/i }));

    await waitFor(() => {
      expect(api.updateEvent).toHaveBeenCalledTimes(1);
      // id and token must be correct
      expect(api.updateEvent.mock.calls[0][0]).toBe('50');
      expect(api.updateEvent.mock.calls[0][2]).toBe(COORD_TOKEN);
      expect(screen.getByText('Coordinator Dashboard')).toBeInTheDocument();
    });
  });

  it('renders banner and QR-code upload inputs and rejects files exceeding 5MB', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    const bannerInput = screen.getByLabelText(/Upload Banner File/i);
    const qrInput = screen.getByLabelText(/Upload QR-Code File/i);
    expect(bannerInput).toBeInTheDocument();
    expect(qrInput).toBeInTheDocument();

    // Create an oversized file (6 MB)
    const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    await user.upload(bannerInput, largeFile);
    expect(screen.getByText(/Banner image size must not exceed 5 MB/i)).toBeInTheDocument();

    const largeQrFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge-qr.png', { type: 'image/png' });
    await user.upload(qrInput, largeQrFile);
    expect(screen.getByText(/QR code image size must not exceed 5 MB/i)).toBeInTheDocument();
  });

  it('submits multipart FormData when banner or QR file is attached', async () => {
    const user = userEvent.setup();
    global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');

    vi.spyOn(api, 'createEvent').mockResolvedValue({ id: 99, title: 'Hackathon with Image' });
    renderCreateForm();

    await user.type(screen.getByLabelText(/Event Title/i), 'Hackathon with Image');
    await user.type(screen.getByLabelText(/Description/i), 'Awesome hackathon with custom assets');
    await user.type(screen.getByLabelText(/Location/i), 'Main Auditorium');
    await user.type(screen.getByLabelText(/Start Date/i), '2026-11-20T10:00');
    await user.type(screen.getByLabelText(/End Date/i), '2026-11-20T18:00');

    const bannerFile = new File(['mock content'], 'poster.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/Upload Banner File/i), bannerFile);

    await user.click(screen.getByRole('button', { name: /Submit for Review/i }));

    await waitFor(() => {
      expect(api.createEvent).toHaveBeenCalledTimes(1);
      const callArg = api.createEvent.mock.calls[0][0];
      expect(callArg instanceof FormData).toBe(true);
      expect(callArg.get('bannerFile')).toBeDefined();
    });
  });
});
