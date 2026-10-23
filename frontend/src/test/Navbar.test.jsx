import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
    expect(document.getElementById('nav-link-today')).toBeInTheDocument();
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

  it('toggles mobile drawer navigation menu on mobile toggle click and updates aria-expanded', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    const mobileMenu = document.getElementById('nav-mobile-menu');

    expect(mobileMenu).not.toHaveClass('open');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(toggleBtn).toHaveAttribute('aria-controls', 'nav-mobile-menu');

    await user.click(toggleBtn);
    expect(mobileMenu).toHaveClass('open');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('nav-mobile-backdrop')).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(mobileMenu).not.toHaveClass('open');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('nav-mobile-backdrop')).not.toBeInTheDocument();
  });

  it('closes mobile drawer when clicking the backdrop', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    const mobileMenu = document.getElementById('nav-mobile-menu');

    await user.click(toggleBtn);
    expect(mobileMenu).toHaveClass('open');

    const backdrop = document.getElementById('nav-mobile-backdrop');
    expect(backdrop).toBeInTheDocument();

    await user.click(backdrop);
    expect(mobileMenu).not.toHaveClass('open');
    expect(document.getElementById('nav-mobile-backdrop')).not.toBeInTheDocument();
  });

  it('closes mobile drawer and restores focus when Escape key is pressed', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    const mobileMenu = document.getElementById('nav-mobile-menu');

    await user.click(toggleBtn);
    expect(mobileMenu).toHaveClass('open');

    await user.keyboard('{Escape}');
    expect(mobileMenu).not.toHaveClass('open');
    expect(document.activeElement).toBe(toggleBtn);
  });

  it('clicking inside the mobile menu drawer does not close it', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    const mobileMenu = document.getElementById('nav-mobile-menu');

    await user.click(toggleBtn);
    expect(mobileMenu).toHaveClass('open');

    // Click directly on drawer container
    await user.click(mobileMenu);
    expect(mobileMenu).toHaveClass('open');
  });

  it('clicking a navigation link inside the mobile menu closes the drawer', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    const mobileMenu = document.getElementById('nav-mobile-menu');

    await user.click(toggleBtn);
    expect(mobileMenu).toHaveClass('open');

    const eventsLink = document.getElementById('nav-mobile-link-events');
    expect(eventsLink).toBeInTheDocument();

    await user.click(eventsLink);
    expect(mobileMenu).not.toHaveClass('open');
  });

  it('locks body scrolling when open and restores it when closed', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });

    expect(document.body.style.overflow).toBe('');

    await user.click(toggleBtn);
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(toggleBtn);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes mobile drawer when window is resized past 768px desktop breakpoint', async () => {
    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    const mobileMenu = document.getElementById('nav-mobile-menu');

    await user.click(toggleBtn);
    expect(mobileMenu).toHaveClass('open');

    // Simulate resize event to desktop width
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(mobileMenu).not.toHaveClass('open');
  });

  it('renders coordinator and authenticated student navigation links in mobile drawer', async () => {
    localStorage.setItem('campuspulse_admin_token', 'user.token');
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'student@campus.edu', role: 'COORDINATOR' })
    );

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 2,
      email: 'student@campus.edu',
      role: 'COORDINATOR',
      createdAt: '2026-10-01T10:00:00',
    });

    const user = userEvent.setup();
    renderNavbar('/');

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    await user.click(toggleBtn);

    expect(document.getElementById('nav-mobile-link-dashboard')).toBeInTheDocument();
    expect(document.getElementById('nav-mobile-link-new-event')).toBeInTheDocument();
    expect(document.getElementById('nav-mobile-logout-btn')).toBeInTheDocument();
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
