import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';
import CoordinatorRequestPage from '../pages/CoordinatorRequestPage';
import CoordinatorStatusPage from '../pages/CoordinatorStatusPage';
import CoordinatorDashboardPage from '../pages/CoordinatorDashboardPage';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import * as api from '../services/api';

describe('Role-Based Frontend Workflows & Pages', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Student Registration Page (/register)', () => {
    it('renders registration form without any role selector', () => {
      render(
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Campus Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Student Account/i })).toBeInTheDocument();

      // Ensure NO role selector exists anywhere in the form
      expect(screen.queryByLabelText(/Role/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ROLE_MAIN_ADMIN/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ROLE_COORDINATOR/i)).not.toBeInTheDocument();
    });

    it('submits registration request with strictly name, email, password', async () => {
      const user = userEvent.setup();

      vi.spyOn(api, 'register').mockResolvedValue({
        message: 'Account registered successfully.',
        user: { id: 10, email: 'student@campus.edu', role: 'USER' },
      });

      vi.spyOn(api, 'login').mockResolvedValue({
        token: 'user.jwt.token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        email: 'student@campus.edu',
        role: 'USER',
      });

      vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
        id: 10,
        email: 'student@campus.edu',
        role: 'USER',
        enabled: true,
      });

      render(
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await user.type(screen.getByLabelText(/Full Name/i), 'Jordan Lee');
      await user.type(screen.getByLabelText(/Campus Email/i), 'student@campus.edu');
      await user.type(screen.getByLabelText(/^Password/i), 'StudentPass123');
      await user.type(screen.getByLabelText(/Confirm Password/i), 'StudentPass123');

      await user.click(screen.getByRole('button', { name: /Create Student Account/i }));

      expect(api.register).toHaveBeenCalledWith({
        name: 'Jordan Lee',
        email: 'student@campus.edu',
        password: 'StudentPass123',
      });
    });
  });

  describe('Universal Login Page (/login)', () => {
    it('authenticates user and provides links to registration', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
      expect(screen.getByText(/Register as Student/i)).toBeInTheDocument();
    });
  });

  describe('Coordinator Access Request Page (/coordinator/request)', () => {
    it('renders request fields and prevents submission of empty form', async () => {
      const user = userEvent.setup();

      localStorage.setItem('campuspulse_admin_token', 'user.token');
      localStorage.setItem(
        'campuspulse_admin_user',
        JSON.stringify({ email: 'student@campus.edu', role: 'USER' })
      );

      vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
        id: 10,
        email: 'student@campus.edu',
        role: 'USER',
        enabled: true,
      });

      vi.spyOn(api, 'fetchMyCoordinatorRequest').mockResolvedValue(null);

      render(
        <MemoryRouter initialEntries={['/coordinator/request']}>
          <AuthProvider>
            <CoordinatorRequestPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByLabelText(/Organization, Club, or Society Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reason & Organizing Responsibilities/i)).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Submit Coordinator Request/i });
      await user.click(submitBtn);

      expect(screen.getByText(/Club or student organization name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Please provide a reason explaining your organizing responsibilities/i)).toBeInTheDocument();
    });
  });

  describe('Coordinator Request Status Page (/coordinator/status)', () => {
    it('renders PENDING status card accurately', async () => {
      localStorage.setItem('campuspulse_admin_token', 'user.token');
      localStorage.setItem(
        'campuspulse_admin_user',
        JSON.stringify({ email: 'student@campus.edu', role: 'USER' })
      );

      vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
        id: 10,
        email: 'student@campus.edu',
        role: 'USER',
        enabled: true,
      });

      vi.spyOn(api, 'fetchMyCoordinatorRequest').mockResolvedValue({
        id: 42,
        userEmail: 'student@campus.edu',
        organizationOrClub: 'Astronomy Club',
        reason: 'Hosting stargazing night',
        status: 'PENDING',
        requestedAt: '2026-10-10T12:00:00',
      });

      render(
        <MemoryRouter initialEntries={['/coordinator/status']}>
          <AuthProvider>
            <CoordinatorStatusPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Astronomy Club')).toBeInTheDocument();
      expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
      expect(screen.getByText(/Awaiting Main Admin Review/i)).toBeInTheDocument();
    });

    it('renders APPROVED status card with dashboard link', async () => {
      localStorage.setItem('campuspulse_admin_token', 'coord.token');
      localStorage.setItem(
        'campuspulse_admin_user',
        JSON.stringify({ email: 'coord@campus.edu', role: 'COORDINATOR' })
      );

      vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
        id: 11,
        email: 'coord@campus.edu',
        role: 'COORDINATOR',
        enabled: true,
      });

      vi.spyOn(api, 'fetchMyCoordinatorRequest').mockResolvedValue({
        id: 43,
        userEmail: 'coord@campus.edu',
        organizationOrClub: 'Robotics Society',
        reason: 'Annual robot wars',
        status: 'APPROVED',
        requestedAt: '2026-10-09T10:00:00',
        reviewedAt: '2026-10-10T11:00:00',
        reviewedByEmail: 'admin@campus.edu',
      });

      render(
        <MemoryRouter initialEntries={['/coordinator/status']}>
          <AuthProvider>
            <CoordinatorStatusPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Robotics Society')).toBeInTheDocument();
      expect(screen.getAllByText(/Approved/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Coordinator Access Granted/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open Coordinator Dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Coordinator Dashboard Protection & Events (/coordinator/dashboard)', () => {
    it('denies access to regular ROLE_USER accounts', async () => {
      localStorage.setItem('campuspulse_admin_token', 'user.token');
      localStorage.setItem(
        'campuspulse_admin_user',
        JSON.stringify({ email: 'ordinary@campus.edu', role: 'USER' })
      );

      vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
        id: 12,
        email: 'ordinary@campus.edu',
        role: 'USER',
        enabled: true,
      });

      render(
        <MemoryRouter initialEntries={['/coordinator/dashboard']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/coordinator/dashboard"
                element={<ProtectedRoute allowedRoles={['COORDINATOR', 'MAIN_ADMIN', 'ADMIN']}><CoordinatorDashboardPage /></ProtectedRoute>}
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Request Coordinator Access/i)).toBeInTheDocument();
      expect(screen.queryByText('Coordinator Dashboard')).not.toBeInTheDocument();
    });

    it('renders coordinator events and KPI metrics for approved coordinator', async () => {
      localStorage.setItem('campuspulse_admin_token', 'coord.token');
      localStorage.setItem(
        'campuspulse_admin_user',
        JSON.stringify({ email: 'coord@campus.edu', role: 'COORDINATOR' })
      );

      vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
        id: 11,
        email: 'coord@campus.edu',
        role: 'COORDINATOR',
        enabled: true,
      });

      vi.spyOn(api, 'fetchMyEvents').mockResolvedValue([
        {
          id: 50,
          title: 'Robotics Workshop 2026',
          eventType: 'WORKSHOP',
          status: 'PENDING_REVIEW',
          location: 'Lab 101',
          startDateTime: '2026-11-20T10:00:00',
          endDateTime: '2026-11-20T16:00:00',
        },
      ]);

      render(
        <MemoryRouter initialEntries={['/coordinator/dashboard']}>
          <AuthProvider>
            <CoordinatorDashboardPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Coordinator Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Robotics Workshop 2026')).toBeInTheDocument();
      expect(screen.getAllByText(/Pending Review/i).length).toBeGreaterThan(0);
      expect(document.getElementById('coord-stat-total')).toHaveTextContent('1');
      expect(document.getElementById('coord-stat-pending')).toHaveTextContent('1');
    });
  });
});
