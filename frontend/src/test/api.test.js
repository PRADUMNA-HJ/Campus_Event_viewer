import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  login,
  fetchCurrentAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchEvents,
  fetchTodayEvents,
  fetchEventById,
  ApiError,
} from '../services/api';

describe('CampusPulse API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Admin Login (POST /api/auth/login)', () => {
    it('authenticates successfully and returns AdminLoginResponse', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        email: 'admin@campus.edu',
        role: 'ADMIN',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login({ email: 'admin@campus.edu', password: 'SecretPassword123' });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/auth/login');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        email: 'admin@campus.edu',
        password: 'SecretPassword123',
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws ApiError with status 401 when credentials are invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password',
        }),
      });

      await expect(
        login({ email: 'admin@campus.edu', password: 'WrongPassword' })
      ).rejects.toThrow(ApiError);
    });

    it('throws ApiError when backend server is completely offline', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(
        login({ email: 'admin@campus.edu', password: 'SecretPassword123' })
      ).rejects.toThrow('Unable to connect to CampusPulse authentication service');
    });
  });

  describe('Admin Profile (GET /api/auth/me)', () => {
    it('sends Authorization: Bearer <token> header and returns AdminProfileResponse', async () => {
      const mockProfile = {
        id: 1,
        email: 'admin@campus.edu',
        role: 'ADMIN',
        createdAt: '2026-10-01T10:00:00',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      const profile = await fetchCurrentAdmin('valid.jwt.token');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/auth/me');
      expect(options.headers.Authorization).toBe('Bearer valid.jwt.token');
      expect(profile).toEqual(mockProfile);
    });

    it('throws ApiError if token is missing', async () => {
      await expect(fetchCurrentAdmin(null)).rejects.toThrow('No authentication token provided');
    });

    it('throws ApiError on 401 unauthorized response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          status: 401,
          error: 'Unauthorized',
          message: 'Token expired',
        }),
      });

      await expect(fetchCurrentAdmin('expired.jwt.token')).rejects.toThrow(ApiError);
    });
  });

  describe('Event CRUD Operations', () => {
    const sampleEventData = {
      title: 'Spring Hackathon 2026',
      description: '48-hour coding marathon.',
      eventType: 'HACKATHON',
      status: 'PUBLISHED',
      location: 'Lab 101',
      startDateTime: '2026-11-15T09:00:00',
      endDateTime: '2026-11-17T18:00:00',
      registrationDeadline: '2026-11-10T23:59:59',
      maxCapacity: 200,
      organizerName: 'Tech Club',
      contactEmail: 'tech@campus.edu',
      whatsappNumber: '+919876543210',
      bannerUrl: null,
    };

    it('POST /api/events creates an event with Bearer authorization', async () => {
      const createdResponse = { id: 10, ...sampleEventData };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => createdResponse,
      });

      const result = await createEvent(sampleEventData, 'valid.token');

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/events');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer valid.token');
      expect(JSON.parse(options.body)).toEqual(sampleEventData);
      expect(result.id).toBe(10);
    });

    it('PUT /api/events/:id updates an existing event', async () => {
      const updatedResponse = { id: 10, ...sampleEventData, title: 'Updated Hackathon' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => updatedResponse,
      });

      const result = await updateEvent(10, { ...sampleEventData, title: 'Updated Hackathon' }, 'valid.token');

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/events/10');
      expect(options.method).toBe('PUT');
      expect(options.headers.Authorization).toBe('Bearer valid.token');
      expect(result.title).toBe('Updated Hackathon');
    });

    it('DELETE /api/events/:id sends DELETE request with Bearer authorization', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await deleteEvent(10, 'valid.token');

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/events/10');
      expect(options.method).toBe('DELETE');
      expect(options.headers.Authorization).toBe('Bearer valid.token');
      expect(result).toBe(true);
    });

    it('extracts backend validationErrors map on 400 Bad Request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          status: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          validationErrors: {
            title: 'Event title is required',
            endDateTime: 'End date time must be after start date time',
          },
        }),
      });

      try {
        await createEvent({ ...sampleEventData, title: '' }, 'valid.token');
        expect.unreachable('Should have thrown ApiError');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(400);
        expect(err.validationErrors).toEqual({
          title: 'Event title is required',
          endDateTime: 'End date time must be after start date time',
        });
      }
    });
  });

  describe('Public Event Discovery', () => {
    it('fetchEvents retrieves events without requiring auth token', async () => {
      const mockList = [{ id: 1, title: 'Hackathon' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockList,
      });

      const { events, isMock } = await fetchEvents();
      expect(events).toEqual(mockList);
      expect(isMock).toBe(false);
    });

    it('fetchEvents falls back to mock data if backend server is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const { events, isMock } = await fetchEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(isMock).toBe(true);
    });

    it('fetchEventById returns null when 404 is received', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { event, isMock } = await fetchEventById(999);
      expect(event).toBeNull();
      expect(isMock).toBe(false);
    });

    it('fetchTodayEvents retrieves events from /events/today without falling back to mock data', async () => {
      const mockList = [{ id: 10, title: 'Hackathon Today' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockList,
      });

      const { events, isMock } = await fetchTodayEvents();
      expect(events).toEqual(mockList);
      expect(isMock).toBe(false);
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/events/today');
    });

    it('fetchTodayEvents throws ApiError on failure and NEVER falls back to mock data', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(fetchTodayEvents()).rejects.toThrow(ApiError);
    });
  });
});
