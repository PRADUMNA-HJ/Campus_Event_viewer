import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as api from '../services/api';

// Test consumer component
function TestAuthConsumer() {
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="user-role">{user?.role || 'none'}</div>
      <div data-testid="token-val">{token || 'none'}</div>
      <button onClick={() => login('admin@campus.edu', 'secret123')}>Login Action</button>
      <button onClick={logout}>Logout Action</button>
    </div>
  );
}

describe('AuthContext and useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes in unauthenticated state when no token is in localStorage', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    expect(screen.getByTestId('token-val')).toHaveTextContent('none');
  });

  it('verifies stored token with /api/auth/me on mount and populates profile', async () => {
    localStorage.setItem('campuspulse_admin_token', 'stored.jwt.token');
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'cached@campus.edu', role: 'ADMIN' })
    );

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 1,
      email: 'admin@campus.edu',
      role: 'ADMIN',
      createdAt: '2026-10-01T10:00:00',
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
    });

    expect(api.fetchCurrentAdmin).toHaveBeenCalledWith('stored.jwt.token');
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@campus.edu');
  });

  it('clears invalid or expired token on mount if /api/auth/me rejects with 401', async () => {
    localStorage.setItem('campuspulse_admin_token', 'expired.token');
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'old@campus.edu', role: 'ADMIN' })
    );

    vi.spyOn(api, 'fetchCurrentAdmin').mockRejectedValue(
      new api.ApiError('Session expired', 401)
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
    expect(localStorage.getItem('campuspulse_admin_token')).toBeNull();
    expect(screen.getByTestId('token-val')).toHaveTextContent('none');
  });

  it('login updates authentication state and persists token to storage', async () => {
    const user = userEvent.setup();

    vi.spyOn(api, 'login').mockResolvedValue({
      token: 'fresh.token.xyz',
      tokenType: 'Bearer',
      expiresIn: 86400,
      email: 'admin@campus.edu',
      role: 'ADMIN',
    });

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 1,
      email: 'admin@campus.edu',
      role: 'ADMIN',
      createdAt: '2026-10-01T10:00:00',
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Login Action' }));
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@campus.edu');
    expect(screen.getByTestId('token-val')).toHaveTextContent('fresh.token.xyz');
    expect(localStorage.getItem('campuspulse_admin_token')).toBe('fresh.token.xyz');
  });

  it('logout clears state and removes token from storage', async () => {
    const user = userEvent.setup();

    localStorage.setItem('campuspulse_admin_token', 'active.token');
    localStorage.setItem(
      'campuspulse_admin_user',
      JSON.stringify({ email: 'admin@campus.edu', role: 'ADMIN' })
    );

    vi.spyOn(api, 'fetchCurrentAdmin').mockResolvedValue({
      id: 1,
      email: 'admin@campus.edu',
      role: 'ADMIN',
      createdAt: '2026-10-01T10:00:00',
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Logout Action' }));
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
    expect(localStorage.getItem('campuspulse_admin_token')).toBeNull();
    expect(screen.getByTestId('token-val')).toHaveTextContent('none');
  });
});
