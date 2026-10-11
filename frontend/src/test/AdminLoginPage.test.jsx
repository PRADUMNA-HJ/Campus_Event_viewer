import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminLoginPage from '../pages/AdminLoginPage';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

describe('AdminLoginPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AuthProvider>
          <AdminLoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

  it('renders login form with email, password, and submit button', async () => {
    renderComponent();

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In as Admin/i })).toBeInTheDocument();
    expect(screen.getByText(/Public registration is disabled/i)).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /Sign In as Admin/i });
    await user.click(submitBtn);

    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });

  it('validates email format before submitting', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText(/Email Address/i);
    await user.type(emailInput, 'invalid-email-address');

    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, 'SomePassword');

    const submitBtn = screen.getByRole('button', { name: /Sign In as Admin/i });
    await user.click(submitBtn);

    expect(screen.getByText('Please provide a valid email address.')).toBeInTheDocument();
  });

  it('displays error alert when backend returns 401 unauthorized', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'login').mockRejectedValue(
      new api.ApiError('Invalid email or password', 401)
    );

    renderComponent();

    const emailInput = screen.getByLabelText(/Email Address/i);
    await user.type(emailInput, 'admin@campus.edu');

    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, 'WrongPassword');

    const submitBtn = screen.getByRole('button', { name: /Sign In as Admin/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Invalid email or password. Please verify your credentials.')
      ).toBeInTheDocument();
    });
  });

  it('handles server network failure gracefully', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'login').mockRejectedValue(
      new TypeError('Failed to fetch')
    );

    renderComponent();

    const emailInput = screen.getByLabelText(/Email Address/i);
    await user.type(emailInput, 'admin@campus.edu');

    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, 'Password123');

    const submitBtn = screen.getByRole('button', { name: /Sign In as Admin/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to connect to the authentication server/i)
      ).toBeInTheDocument();
    });
  });
});
