/**
 * CampusPulse API Service
 * 
 * Centralized HTTP client communicating with the Spring Boot backend REST endpoints:
 * - Public: GET /api/events, GET /api/events/{id}
 * - Auth: POST /api/auth/login, POST /api/auth/register, GET /api/auth/me
 * - Coordinator Requests: POST /api/coordinator-requests, GET /api/coordinator-requests/me
 * - Coordinator Event CRUD: GET /api/events/my, POST /api/events, PUT /api/events/{id}, DELETE /api/events/{id}
 * - Main Admin Governance:
 *     GET /api/admin/coordinator-requests, POST /api/admin/coordinator-requests/{id}/approve,
 *     POST /api/admin/coordinator-requests/{id}/reject, GET /api/admin/coordinators,
 *     POST /api/admin/coordinators/{id}/revoke, GET /api/admin/events,
 *     POST /api/admin/events/{id}/publish, POST /api/admin/events/{id}/reject,
 *     DELETE /api/admin/events/{id}
 * 
 * Never logs credentials or JWT tokens.
 * Handles standardized ErrorResponse payloads and extracts validation errors.
 */

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').trim();
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? rawApiUrl.replace(/\/+$/, '')
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

/**
 * Custom API error carrying HTTP status and backend field validation errors.
 */
export class ApiError extends Error {
  constructor(message, status = 500, validationErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

/**
 * Parses non-2xx responses into structured ApiError instances.
 */
async function handleResponseError(response) {
  let errorMessage = `Request failed with status ${response.status}`;
  let validationErrors = null;
  try {
    const data = await response.json();
    if (data.message) {
      errorMessage = data.message;
    } else if (data.error) {
      errorMessage = data.error;
    }
    if (data.validationErrors && typeof data.validationErrors === 'object') {
      validationErrors = data.validationErrors;
    }
  } catch {
    // Non-JSON error body (e.g., gateway timeout)
    if (response.status === 401) {
      errorMessage = 'Invalid email or password.';
    } else if (response.status === 403) {
      errorMessage = 'Access denied. You do not have permission for this resource.';
    } else if (response.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (response.status === 409) {
      errorMessage = 'Conflict: An existing resource or invalid state transition prevented this action.';
    }
  }
  throw new ApiError(errorMessage, response.status, validationErrors);
}

/**
 * Helper to build auth headers.
 */
function authHeaders(token, extra = {}) {
  const headers = {
    'Accept': 'application/json',
    ...extra,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Mock event data used as a fallback only when public backend API is unreachable.
 */
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'Spring Hackathon 2026',
    description: 'A 48-hour hackathon bringing together students from across campus to build innovative solutions. Teams of 2-4 will compete for prizes across categories including AI/ML, Web3, and Social Impact.',
    eventType: 'HACKATHON',
    status: 'PUBLISHED',
    location: 'Innovation Center, Building A',
    startDateTime: '2026-11-15T09:00:00',
    endDateTime: '2026-11-17T18:00:00',
    registrationDeadline: '2026-11-10T23:59:59',
    maxCapacity: 200,
    organizerName: 'Tech Society',
    contactEmail: 'techsoc@campus.edu',
    whatsappNumber: '+919876543210',
    bannerUrl: null,
    registrationUrl: 'https://hackathon.campus.edu/register',
    createdAt: '2026-10-01T10:00:00',
    updatedAt: '2026-10-01T10:00:00',
  },
  {
    id: 2,
    title: 'Full-Stack Development Workshop',
    description: 'Intensive hands-on workshop covering React, Spring Boot, and PostgreSQL. Build a complete web application from scratch with industry best practices.',
    eventType: 'WORKSHOP',
    status: 'PUBLISHED',
    location: 'Computer Lab 304',
    startDateTime: '2026-11-20T10:00:00',
    endDateTime: '2026-11-20T17:00:00',
    registrationDeadline: '2026-11-18T23:59:59',
    maxCapacity: 60,
    organizerName: 'Cloud Computing Club',
    contactEmail: 'cloudclub@campus.edu',
    whatsappNumber: '+919876543211',
    bannerUrl: null,
    registrationUrl: null,
    createdAt: '2026-10-02T10:00:00',
    updatedAt: '2026-10-02T10:00:00',
  },
  {
    id: 3,
    title: 'AI & Machine Learning Seminar',
    description: 'Explore the latest breakthroughs in artificial intelligence and machine learning. Topics include transformer architectures, reinforcement learning, and ethical AI.',
    eventType: 'SEMINAR',
    status: 'PUBLISHED',
    location: 'Auditorium Hall, Main Block',
    startDateTime: '2026-11-25T14:00:00',
    endDateTime: '2026-11-25T18:00:00',
    registrationDeadline: '2026-11-23T23:59:59',
    maxCapacity: 300,
    organizerName: 'AI Research Lab',
    contactEmail: 'ailab@campus.edu',
    whatsappNumber: null,
    bannerUrl: null,
    registrationUrl: null,
    createdAt: '2026-10-03T10:00:00',
    updatedAt: '2026-10-03T10:00:00',
  },
];

let usingMockData = false;

/**
 * Returns whether the last public GET call used mock data.
 */
export function isUsingMockData() {
  return usingMockData;
}

/* ===================================================================
   1. Public Discovery Endpoints
   =================================================================== */

/**
 * Fetches all upcoming published events (Public).
 * Falls back to mock data if the API is unavailable.
 */
export async function fetchEvents() {
  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      await handleResponseError(response);
    }
    const events = await response.json();
    usingMockData = false;
    return { events, isMock: false };
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('[CampusPulse] Backend returned error for /events, falling back to mock data:', error.message);
    } else {
      console.warn('[CampusPulse] Backend API unavailable, using mock data:', error.message);
    }
    usingMockData = true;
    return { events: MOCK_EVENTS, isMock: true };
  }
}

/**
 * Fetches all published events scheduled for or active today (Public).
 * Strictly communicates with live backend data and never displays mock events.
 */
export async function fetchTodayEvents() {
  try {
    const response = await fetch(`${API_BASE_URL}/events/today`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      await handleResponseError(response);
    }
    if (response.status === 204) {
      return { events: [], isMock: false };
    }
    const data = await response.json();
    let events = null;
    if (Array.isArray(data)) {
      events = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.events)) {
        events = data.events;
      } else if (Array.isArray(data.data)) {
        events = data.data;
      }
    }

    if (!events) {
      throw new ApiError('Unexpected response payload format from events service.', response.status || 500);
    }

    return { events, isMock: false };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to events service. Please verify the backend is running.', 0);
  }
}

/**
 * Fetches a single event by ID (Public).
 * Falls back to mock data if the API is unavailable.
 */
export async function fetchEventById(id, token = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      if (response.status === 404) {
        return { event: null, isMock: false };
      }
      await handleResponseError(response);
    }
    const event = await response.json();
    usingMockData = false;
    return { event, isMock: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { event: null, isMock: false };
    }
    console.warn('[CampusPulse] Backend API unavailable, using mock data for event:', id);
    usingMockData = true;
    const event = MOCK_EVENTS.find(e => e.id === Number(id)) || null;
    return { event, isMock: true };
  }
}

/* ===================================================================
   2. Authentication & Account Registration Endpoints
   =================================================================== */

/**
 * Registers a new regular user account (ROLE_USER only).
 * POST /api/auth/register
 */
export async function register(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
      }),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to registration service. Please verify the backend is running.', 0);
  }
}

/**
 * Authenticates user or administrator credentials.
 * POST /api/auth/login
 */
export async function login(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to CampusPulse authentication service. Please ensure the backend is running.', 0);
  }
}

/**
 * Retrieves the profile of the currently authenticated account.
 * GET /api/auth/me
 */
export async function fetchCurrentAdmin(token) {
  if (!token) {
    throw new ApiError('No authentication token provided.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to verify session.', 0);
  }
}

/* ===================================================================
   3. Coordinator Access Request Endpoints
   =================================================================== */

/**
 * Submits a coordinator access request on behalf of the current user.
 * POST /api/coordinator-requests
 */
export async function submitCoordinatorRequest(data, token) {
  if (!token) {
    throw new ApiError('Authentication required to submit coordinator request.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/coordinator-requests`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        organizationOrClub: data.organizationOrClub,
        reason: data.reason,
        contactDetails: data.contactDetails || null,
      }),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to submit request.', 0);
  }
}

/**
 * Retrieves the current user's coordinator request status.
 * GET /api/coordinator-requests/me
 */
export async function fetchMyCoordinatorRequest(token) {
  if (!token) {
    throw new ApiError('Authentication required to check request status.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/coordinator-requests/me`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to retrieve coordinator request status.', 0);
  }
}

/* ===================================================================
   4. Coordinator Event Management Endpoints
   =================================================================== */

/**
 * Lists events created by the authenticated coordinator.
 * GET /api/events/my
 */
export async function fetchMyEvents(token) {
  if (!token) {
    throw new ApiError('Authentication required to fetch coordinator events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/my`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to load your events.', 0);
  }
}

/**
 * Creates a new event (Coordinator / Admin).
 * POST /api/events
 */
export async function createEvent(eventData, token) {
  if (!token) {
    throw new ApiError('Authentication required to create events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to create event.', 0);
  }
}

/**
 * Updates an existing event (Coordinator / Admin).
 * PUT /api/events/{id}
 */
export async function updateEvent(id, eventData, token) {
  if (!token) {
    throw new ApiError('Authentication required to update events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to update event.', 0);
  }
}

/**
 * Deletes an event by ID (Coordinator own / Admin any).
 * DELETE /api/events/{id}
 */
export async function deleteEvent(id, token) {
  if (!token) {
    throw new ApiError('Authentication required to delete events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to delete event.', 0);
  }
}

/* ===================================================================
   5. Main Admin Management & Moderation Endpoints
   =================================================================== */

/**
 * Lists coordinator requests (Main Admin).
 * GET /api/admin/coordinator-requests
 */
export async function fetchCoordinatorRequests(status, token) {
  if (!token) {
    throw new ApiError('Authentication required to view coordinator requests.', 401);
  }

  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  try {
    const response = await fetch(`${API_BASE_URL}/admin/coordinator-requests${query}`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to load coordinator requests.', 0);
  }
}

/**
 * Gets a specific coordinator request by ID (Main Admin).
 * GET /api/admin/coordinator-requests/{id}
 */
export async function fetchCoordinatorRequestById(id, token) {
  if (!token) {
    throw new ApiError('Authentication required.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/coordinator-requests/${id}`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to load coordinator request details.', 0);
  }
}

/**
 * Approves a coordinator request (Main Admin).
 * POST /api/admin/coordinator-requests/{id}/approve
 */
export async function approveCoordinatorRequest(id, token, reviewDto = {}) {
  if (!token) {
    throw new ApiError('Authentication required to approve requests.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/coordinator-requests/${id}/approve`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(reviewDto),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to approve request.', 0);
  }
}

/**
 * Rejects a coordinator request (Main Admin).
 * POST /api/admin/coordinator-requests/{id}/reject
 */
export async function rejectCoordinatorRequest(id, token, reviewDto = {}) {
  if (!token) {
    throw new ApiError('Authentication required to reject requests.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/coordinator-requests/${id}/reject`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(reviewDto),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to reject request.', 0);
  }
}

/**
 * Lists all active coordinators (Main Admin).
 * GET /api/admin/coordinators
 */
export async function fetchCoordinators(token) {
  if (!token) {
    throw new ApiError('Authentication required to list coordinators.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/coordinators`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to load coordinator roster.', 0);
  }
}

/**
 * Revokes coordinator privileges (Main Admin).
 * POST /api/admin/coordinators/{id}/revoke
 */
export async function revokeCoordinator(id, token, reason = null) {
  if (!token) {
    throw new ApiError('Authentication required to revoke coordinator privileges.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/coordinators/${id}/revoke`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(reason ? { reason } : {}),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to revoke coordinator privileges.', 0);
  }
}

/**
 * Lists all events across all lifecycle statuses (Main Admin).
 * GET /api/admin/events
 */
export async function fetchAllEventsAdmin(token) {
  if (!token) {
    throw new ApiError('Authentication required to view all events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/events`, {
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to connect to server to load administrator events.', 0);
  }
}

/**
 * Publishes an event submission (Main Admin).
 * POST /api/admin/events/{id}/publish
 */
export async function publishEventAdmin(id, token, note = null) {
  if (!token) {
    throw new ApiError('Authentication required to publish events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/events/${id}/publish`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(note ? { note } : {}),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to publish event.', 0);
  }
}

/**
 * Rejects an event submission (Main Admin).
 * POST /api/admin/events/{id}/reject
 */
export async function rejectEventAdmin(id, token, note = null) {
  if (!token) {
    throw new ApiError('Authentication required to reject events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/events/${id}/reject`, {
      method: 'POST',
      headers: authHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(note ? { note } : {}),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to reject event.', 0);
  }
}

/**
 * Deletes any event (Main Admin).
 * DELETE /api/admin/events/{id}
 */
export async function deleteEventAdmin(id, token) {
  if (!token) {
    throw new ApiError('Authentication required to delete events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/events/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to delete event.', 0);
  }
}
