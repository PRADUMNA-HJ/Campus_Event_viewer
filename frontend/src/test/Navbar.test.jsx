import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

describe('Navbar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderNavbar = (initialRoute = '/') =>
    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    );

  it('renders public navigation links and Admin Login button when unauthenticated', async () => {
    renderNavbar('/');

    expect(document.getElementById('nav-link-events')).toBeInTheDocument();
    expect(document.getElementById('nav-link-about')).toBeInTheDocument();
    expect(document.getElementById('nav-link-admin-login')).toBeInTheDocument();
    expect(document.getElementById('nav-link-dashboard')).not.toBeInTheDocument();
  });

  it('renders Dashboard link and Logout button when admin is authenticated', async () => {
    localStorage.setItem('campuspulse_admin_token', 'valid.token');
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'lead.admin@campus.edu', role: 'ADMIN' })
    );

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 1,
      email: 'lead.admin@campus.edu',
      role: 'ADMIN',
      createdAt: '2026-10-01T10:00:00',
    });

    renderNavbar('/admin/dashboard');

    expect(await screen.findByText('lead.admin')).toBeInTheDocument();
    expect(document.getElementById('nav-link-dashboard')).toBeInTheDocument();
    expect(document.getElementById('nav-logout-btn')).toBeInTheDocument();
    expect(document.getElementById('nav-link-admin-login')).not.toBeInTheDocument();
  });

  it('toggles mobile drawer navigation menu on mobile toggle click', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    const mobileMenu = document.getElementById('nav-mobile-menu');

    expect(mobileMenu).not.toHaveClass('open');

    await user.click(toggleBtn);
    expect(mobileMenu).toHaveClass('open');

    await user.click(toggleBtn);
    expect(mobileMenu).not.toHaveClass('open');
  });

  it('clicking logout clears admin session', async () => {
    const user = userEvent.setup();
    localStorage.setItem('campuspulse_admin_token', 'valid.token');
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'lead.admin@campus.edu', role: 'ADMIN' })
    );

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 1,
      email: 'lead.admin@campus.edu',
      role: 'ADMIN',
      createdAt: '2026-10-01T10:00:00',
    });

    renderNavbar('/admin/dashboard');

    expect(await screen.findByText('lead.admin')).toBeInTheDocument();
    const logoutBtn = document.getElementById('nav-logout-btn');
    await user.click(logoutBtn);

    expect(document.getElementById('nav-link-dashboard')).not.toBeInTheDocument();
    expect(localStorage.getItem('campuspulse_admin_token')).toBeNull();
  });
});
