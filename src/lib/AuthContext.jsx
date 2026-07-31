import React, { createContext, useState, useContext, useEffect } from 'react';
import api from './api';

// Decode JWT payload (no verification — the backend already verified it).
// We only need this to extract `role` when the login response's user object
// doesn't include it (older backend versions).
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

    try {
      // Verify token is still valid by hitting a protected endpoint
      const data = await api.admin.stats();
      // If we get here, token is valid and user is admin
      setIsAuthenticated(true);
      // Decode token to get user info
      const payload = decodeJwtPayload(token);
      setUser({ role: 'ADMIN', id: payload?.id, username: payload?.username });
      setAuthError(null);
    } catch (error) {
      // Token expired or not admin
      localStorage.removeItem('admin_token');
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      const data = await api.auth.login(email, password);
      if (!data.success) throw new Error(data.message || 'Login failed');

      const token = data.accessToken || data.token;
      const user = data.user;

      // Check role from the user object first, fall back to decoding the JWT.
      // Some backend deployments return the user object without a `role` field,
      // but the JWT always carries it.
      let role = user?.role;
      if (!role) {
        const payload = decodeJwtPayload(token);
        role = payload?.role;
      }

      if (role !== 'ADMIN') {
        throw new Error('Access denied. Admin credentials required.');
      }

      localStorage.setItem('admin_token', token);
      setUser({ ...user, role: 'ADMIN' });
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

  const navigateToLogin = () => {
    // No-op — handled by routing in App.jsx
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
      navigateToLogin,
      checkUserAuth: checkAuth,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
