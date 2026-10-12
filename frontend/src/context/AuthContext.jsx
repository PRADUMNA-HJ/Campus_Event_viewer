import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, fetchCurrentAdmin } from '../services/api';

/**
 * CampusPulse Authentication Context & Provider
 * 
 * Manages authentication state, token persistence, and session verification
 * for regular users (ROLE_USER), coordinators (ROLE_COORDINATOR),
 * and administrators (ROLE_MAIN_ADMIN).
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

  // Refresh user profile directly from GET /api/auth/me
  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const profile = await fetchCurrentAdmin(token);
      if (profile.enabled === false) {
        logout();
        return null;
      }
      setUser(profile);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Ignore storage error
      }
      return profile;
    } catch (error) {
      if (error?.status === 401) {
        console.warn('[CampusPulse] Session expired during profile refresh:', error.message);
        logout();
      }
      return null;
    }
  }, [token, logout]);

  // Authenticate and store JWT
  const login = useCallback(async (email, password) => {
    const response = await apiLogin({ email, password });
    
    // response is { token, tokenType, expiresIn, email, role, name }
    const authToken = response.token;
    const initialUser = {
      email: response.email,
      role: response.role,
      name: response.name || null,
    };

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(initialUser));
    } catch (e) {
      console.warn('[CampusPulse] Failed to persist token to storage:', e);
    }

    setToken(authToken);
    setUser(initialUser);

    // Fetch full profile from GET /api/auth/me to enrich user data with coordinatorRequestStatus etc.
    try {
      const profile = await fetchCurrentAdmin(authToken);
      setUser(profile);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Ignore storage error
      }
    } catch {
      // If /me call fails initially, fallback initialUser remains
    }

    return response;
  }, []);

  // Verify stored token on initial mount using GET /api/auth/me
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
          if (profile.enabled === false) {
            logout();
          } else {
            setUser(profile);
            try {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
            } catch {
              // Ignore storage error
            }
          }
        }
      } catch (error) {
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

  // Role helpers
  const isMainAdmin = Boolean(user && (user.role === 'MAIN_ADMIN' || user.role === 'ADMIN'));
  const isCoordinator = Boolean(user && user.role === 'COORDINATOR');
  const isUser = Boolean(user && user.role === 'USER');

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    refreshUser,
    isMainAdmin,
    isCoordinator,
    isUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access the CampusPulse authentication context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
