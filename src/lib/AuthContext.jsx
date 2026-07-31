import React, { createContext, useState, useContext, useEffect } from 'react';
import api from './api';

// Decode JWT payload (no verification — the backend already verified it).
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

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    const token = localStorage.getItem('admin_token');

    if (!token) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Please log in' });
      return;
    }

    // Decode JWT locally — trust it immediately without a network round-trip.
    // This makes the dashboard load instantly (same pattern as Vercel/Sentry).
    // The actual data endpoints will 401 if the token is truly invalid.
    const payload = decodeJwtPayload(token);

    if (!payload) {
      // Malformed token
      localStorage.removeItem('admin_token');
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Invalid session. Please log in again.' });
      return;
    }

    // Check token expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('admin_token');
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Session expired. Please log in again.' });
      return;
    }

    // Token looks valid — authenticate from JWT payload, let dashboard load data async
    const role = payload.role;
    if (role !== 'ADMIN') {
      localStorage.removeItem('admin_token');
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Access denied. Admin credentials required.' });
      return;
    }

    setIsAuthenticated(true);
    setUser({ role: 'ADMIN', id: payload.id, username: payload.username });
    setAuthError(null);
    setIsLoadingAuth(false);
  };

  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      if (!data.success) throw new Error(data.message || 'Login failed');

      const token = data.accessToken || data.token;
      if (!token) throw new Error('No token returned from server');

      // Check role from user object first, fall back to JWT payload
      let role = data.user?.role;
      if (!role) {
        const payload = decodeJwtPayload(token);
        role = payload?.role;
      }

      if (role !== 'ADMIN') {
        throw new Error('Access denied. Admin credentials required.');
      }

      localStorage.setItem('admin_token', token);
      const payload = decodeJwtPayload(token);
      setUser({ role: 'ADMIN', id: payload?.id, username: payload?.username, ...data.user });
      setIsAuthenticated(true);
      setAuthError(null);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required', message: 'Logged out' });
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
