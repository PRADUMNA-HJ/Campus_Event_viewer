import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated users to /admin/login', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route path="dashboard" element={<div>Protected Admin Content</div>} />
            </Route>
            <Route path="/admin/login" element={<div>Admin Login Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Admin Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated with a valid token', async () => {
    localStorage.setItem('campuspulse_admin_token', 'valid.token');
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
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route path="dashboard" element={<div>Protected Admin Content</div>} />
            </Route>
            <Route path="/admin/login" element={<div>Admin Login Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Protected Admin Content')).toBeInTheDocument();
    expect(screen.queryByText('Admin Login Screen')).not.toBeInTheDocument();
  });
});
