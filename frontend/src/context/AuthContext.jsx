import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, fetchCurrentAdmin } from '../services/api';

/**
 * CampusPulse Authentication Context & Provider
 * 
 * Manages administrator authentication state, token persistence, and session verification.
 * 
 * -----------------------------------------------------------------------------------------
 * Security & Token Storage Architectural Note:
 * -----------------------------------------------------------------------------------------
 * The Spring Boot backend currently implements stateless JWT authentication returning
 * a Bearer token in the JSON response body (AdminLoginResponse) and requires the
 * `Authorization: Bearer <token>` header for protected endpoints (/api/auth/me,
 * POST/PUT/DELETE /api/events). It does not configure or set HttpOnly cookies.
 * 
 * Consequently, the frontend stores the bearer token in browser `localStorage`.
 * Security consideration:
 * - Any script executing within the document origin could theoretically access localStorage.
 *   This poses an XSS (Cross-Site Scripting) vulnerability surface if unsanitized user content
 *   were injected.
 * - In this release, user-supplied content is rendered safely via React's standard escaping,
 *   and no dynamic script injection is permitted.
 * - For future enterprise production deployments, refactoring the backend to issue
 *   a secure, HttpOnly, SameSite=Strict session cookie is recommended to eliminate
 *   token accessibility from JavaScript entirely.
 * 
 * Furthermore, frontend route guards are purely a UX affordance.
 * Spring Security's SecurityFilterChain with JwtAuthenticationFilter remains
 * the authoritative security boundary for all mutating operations.
 * -----------------------------------------------------------------------------------------
 */

const TOKEN_STORAGE_KEY = 'campuspulse_admin_token';
const USER_STORAGE_KEY = 'campuspulse_admin_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Logout clears all stored tokens and resets user state
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.error('[CampusPulse] Error clearing session storage:', e);
    }
    setToken(null);
    setUser(null);
  }, []);

  // Authenticate and store JWT
  const login = useCallback(async (email, password) => {
    const response = await apiLogin({ email, password });
    
    // response is AdminLoginResponse { token, tokenType, expiresIn, email, role }
    const authToken = response.token;
    const initialUser = {
      email: response.email,
      role: response.role,
    };

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(initialUser));
    } catch (e) {
      console.warn('[CampusPulse] Failed to persist token to storage:', e);
    }

    setToken(authToken);
    setUser(initialUser);

    // Try fetching full profile from GET /api/auth/me to enrich user data
    try {
      const profile = await fetchCurrentAdmin(authToken);
      setUser(profile);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Ignore storage error
      }
    } catch {
      // If /me verification fails or backend does not respond, the initial user remains
    }

    return response;
  }, []);

  // Verify stored token on initial mount using GET /api/auth/me
  // Never assume a token is valid merely because it exists in browser storage!
  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      if (!token) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await fetchCurrentAdmin(token);
        if (isMounted) {
          setUser(profile);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
          } catch {
            // Ignore storage error
          }
        }
      } catch (error) {
        // If token is invalid or expired (401), clear the session safely
        console.warn('[CampusPulse] Session expired or invalid, clearing authentication:', error.message);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [token, logout]);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access the CampusPulse authentication context.
 * @returns {{
 *   token: string|null,
 *   user: {id?: number, email: string, role: string, createdAt?: string}|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: (email: string, password: string) => Promise<Object>,
 *   logout: () => void
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
