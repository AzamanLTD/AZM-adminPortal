import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api, { clearAccessToken } from './api';
import { connectAdminSocket, disconnectAdminSocket } from './adminSocket';

// Decode JWT payload for display/role hints only. Authentication and role
// authorization are performed by the backend session endpoint.
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/** @typedef {{
 * user: object | null,
 * isAuthenticated: boolean,
 * isLoadingAuth: boolean,
 * isLoadingPublicSettings: boolean,
 * authError: { type: string, message: string } | null,
 * appPublicSettings: unknown,
 * authChecked: boolean,
 * login: (email: string, password: string) => Promise<{ success: boolean, message?: string }>,
 * logout: () => Promise<void>,
 * navigateToLogin: () => void,
 * checkUserAuth: () => Promise<void>,
 * checkAppState: () => Promise<void>
 * }} AuthContextValue */
const AuthContext = createContext(/** @type {AuthContextValue | null} */ (null));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const applySession = useCallback((session) => {
    const token = session?.accessToken;
    if (!token) throw new Error('No access token returned from server');
    const payload = decodeJwtPayload(token);
    const sessionUser = session.user || payload || {};
    if (String(sessionUser.role || payload?.role || '').toUpperCase() !== 'ADMIN') {
      throw new Error('Access denied. Admin credentials required.');
    }

    // Session restoration does not pass through api.auth.login(), so it must
    // explicitly establish the realtime handshake after the fresh access JWT
    // has been validated. connectAdminSocket also rotates credentials on an
    // already-connected singleton when the backend issues a fresh access JWT.
    connectAdminSocket(token);

    setUser({
      role: 'ADMIN',
      id: payload?.id ?? sessionUser.id,
      username: payload?.username ?? sessionUser.username,
      ...sessionUser,
    });
    setIsAuthenticated(true);
    setAuthError(null);
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      // No localStorage token is trusted. The backend validates and rotates the
      // HttpOnly refresh cookie, then returns a short-lived access JWT.
      const session = await api.auth.restore();
      applySession(session);
    } catch (error) {
      clearAccessToken();
      disconnectAdminSocket();
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message || 'Please log in' });
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applySession]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      if (!data.success) throw new Error(data.message || 'Login failed');
      applySession(data);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      // Revoke the REST session and immediately tear down the authenticated
      // admin_spy socket. Keeping it alive after logout would leave the old
      // authenticated connection subscribed to privileged realtime data.
      disconnectAdminSocket();
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Logged out' });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      authChecked: !isLoadingAuth,
      login,
      logout,
      navigateToLogin: () => {},
      checkUserAuth: checkAuth,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
