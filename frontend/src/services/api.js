/**
 * CampusPulse API Service
 * 
 * Centralized HTTP client communicating with the Spring Boot backend REST endpoints:
 * - Public: GET /api/events, GET /api/events/{id}
 * - Auth: POST /api/auth/login, GET /api/auth/me
 * - Protected Admin CRUD: POST /api/events, PUT /api/events/{id}, DELETE /api/events/{id}
 * 
 * Never logs credentials or JWT tokens.
 * Handles standardized ErrorResponse payloads and extracts validation errors.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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
      errorMessage = 'Access denied. Administrator privileges required.';
    } else if (response.status === 404) {
      errorMessage = 'Resource not found.';
    }
  }
  throw new ApiError(errorMessage, response.status, validationErrors);
}

/**
 * Mock event data used as a fallback only when public backend API is unreachable.
 */
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'Spring Hackathon 2026',
    description: 'A 48-hour hackathon bringing together students from across campus to build innovative solutions. Teams of 2-4 will compete for prizes across categories including AI/ML, Web3, and Social Impact. Mentors from top tech companies will be available throughout the event.',
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
    createdAt: '2026-10-01T10:00:00',
    updatedAt: '2026-10-01T10:00:00',
  },
  {
    id: 2,
    title: 'Full-Stack Development Workshop',
    description: 'Intensive hands-on workshop covering React, Spring Boot, and PostgreSQL. Build a complete web application from scratch with industry best practices including CI/CD pipelines, testing strategies, and deployment to cloud platforms.',
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
    createdAt: '2026-10-02T10:00:00',
    updatedAt: '2026-10-02T10:00:00',
  },
  {
    id: 3,
    title: 'AI & Machine Learning Seminar',
    description: 'Explore the latest breakthroughs in artificial intelligence and machine learning. Topics include transformer architectures, reinforcement learning, and ethical AI. Featuring guest speakers from Google DeepMind and OpenAI.',
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
    createdAt: '2026-10-03T10:00:00',
    updatedAt: '2026-10-03T10:00:00',
  },
  {
    id: 4,
    title: 'Cybersecurity CTF Challenge',
    description: 'Capture the Flag competition testing your cybersecurity skills across web exploitation, binary analysis, cryptography, forensics, and network security. Open to all skill levels with beginner-friendly challenges.',
    eventType: 'TECHNICAL',
    status: 'PUBLISHED',
    location: 'Networking Lab, Block C',
    startDateTime: '2026-12-01T09:00:00',
    endDateTime: '2026-12-01T21:00:00',
    registrationDeadline: '2026-11-28T23:59:59',
    maxCapacity: 100,
    organizerName: 'CyberSec Club',
    contactEmail: 'cybersec@campus.edu',
    whatsappNumber: '+919876543212',
    bannerUrl: null,
    createdAt: '2026-10-04T10:00:00',
    updatedAt: '2026-10-04T10:00:00',
  },
  {
    id: 5,
    title: 'Annual Cultural Fest — Pulse 2026',
    description: 'The flagship cultural festival celebrating art, music, dance, and drama. Three days of performances, competitions, food stalls, and workshops. Featuring headline performances from indie bands and renowned artists.',
    eventType: 'CULTURAL',
    status: 'PUBLISHED',
    location: 'Open Air Theatre & Campus Grounds',
    startDateTime: '2026-12-10T16:00:00',
    endDateTime: '2026-12-12T23:00:00',
    registrationDeadline: '2026-12-08T23:59:59',
    maxCapacity: 1000,
    organizerName: 'Cultural Committee',
    contactEmail: 'cultural@campus.edu',
    whatsappNumber: '+919876543213',
    bannerUrl: null,
    createdAt: '2026-10-05T10:00:00',
    updatedAt: '2026-10-05T10:00:00',
  },
  {
    id: 6,
    title: 'Blockchain & Web3 Guest Lecture',
    description: 'A special guest lecture by industry pioneers exploring the future of decentralized applications, smart contracts, and the web3 ecosystem. Q&A session included with opportunities for internship referrals.',
    eventType: 'GUEST_LECTURE',
    status: 'PUBLISHED',
    location: 'Seminar Hall 2, Block B',
    startDateTime: '2026-12-05T15:00:00',
    endDateTime: '2026-12-05T17:30:00',
    registrationDeadline: '2026-12-04T23:59:59',
    maxCapacity: 150,
    organizerName: 'Blockchain Society',
    contactEmail: 'blockchain@campus.edu',
    whatsappNumber: null,
    bannerUrl: null,
    createdAt: '2026-10-06T10:00:00',
    updatedAt: '2026-10-06T10:00:00',
  },
];

let usingMockData = false;

/**
 * Returns whether the last public GET call used mock data.
 */
export function isUsingMockData() {
  return usingMockData;
}

/**
 * Fetches all upcoming events from the backend (Public).
 * Falls back to mock data if the API is unavailable.
 * 
 * @returns {Promise<{events: Array, isMock: boolean}>}
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
      // Backend responded with HTTP error code
      console.warn('[CampusPulse] Backend returned error for /events, falling back to mock data:', error.message);
    } else {
      // Network unreachable
      console.warn('[CampusPulse] Backend API unavailable, using mock data:', error.message);
    }
    usingMockData = true;
    return { events: MOCK_EVENTS, isMock: true };
  }
}

/**
 * Fetches a single event by ID from the backend (Public).
 * Falls back to mock data if the API is unavailable.
 * 
 * @param {number|string} id - The event ID
 * @returns {Promise<{event: Object|null, isMock: boolean}>}
 */
export async function fetchEventById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      headers: { 'Accept': 'application/json' },
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

/**
 * Authenticates administrator credentials.
 * POST /api/auth/login
 * 
 * @param {{email: string, password: string}} credentials
 * @returns {Promise<{token: string, tokenType: string, expiresIn: number, email: string, role: string}>}
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
 * Retrieves the profile of the currently authenticated administrator.
 * GET /api/auth/me
 * 
 * @param {string} token - JWT bearer token
 * @returns {Promise<{id: number, email: string, role: string, createdAt: string}>}
 */
export async function fetchCurrentAdmin(token) {
  if (!token) {
    throw new ApiError('No authentication token provided.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
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

/**
 * Creates a new event (Admin only).
 * POST /api/events
 * 
 * @param {Object} eventData - Matches EventCreateRequest DTO
 * @param {string} token - JWT bearer token
 * @returns {Promise<Object>} Created EventResponse
 */
export async function createEvent(eventData, token) {
  if (!token) {
    throw new ApiError('Authentication required to create events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
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
 * Updates an existing event (Admin only).
 * PUT /api/events/{id}
 * 
 * @param {number|string} id - Event ID
 * @param {Object} eventData - Matches EventCreateRequest DTO
 * @param {string} token - JWT bearer token
 * @returns {Promise<Object>} Updated EventResponse
 */
export async function updateEvent(id, eventData, token) {
  if (!token) {
    throw new ApiError('Authentication required to update events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
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
 * Deletes an event by ID (Admin only).
 * DELETE /api/events/{id}
 * 
 * @param {number|string} id - Event ID
 * @param {string} token - JWT bearer token
 * @returns {Promise<boolean>} True if deletion succeeded
 */
export async function deleteEvent(id, token) {
  if (!token) {
    throw new ApiError('Authentication required to delete events.', 401);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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
