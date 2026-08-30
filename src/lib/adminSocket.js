import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://azm-backend.onrender.com';

let socket = null;

export function connectAdminSocket(token) {
  if (!token) return null;
  if (socket?.connected) {
    // Session restoration can rotate the short-lived access JWT while the
    // singleton socket is still connected. Reconnect with the fresh token so
    // the backend's Socket.IO JWT middleware never relies on a stale session.
    if (socket.auth?.token !== token) {
      socket.auth = { ...(socket.auth || {}), token };
      socket.disconnect().connect();
    }
    return socket;
  }
  if (socket) disconnectAdminSocket();

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => socket.emit('join_admin_spy'));
  socket.on('connect_error', (err) => console.warn('[AdminSocket] connection error:', err.message));

  if (typeof window !== 'undefined') window.__azAdminSocket = socket;
  return socket;
}

export function updateAdminSocketToken(token) {
  if (!token || !socket) return;
  if (socket.auth?.token === token) return;
  socket.auth = { ...(socket.auth || {}), token };
  if (socket.connected) socket.disconnect().connect();
}

export function getAdminSocket() { return socket; }

export function disconnectAdminSocket() {
  socket?.disconnect();
  socket = null;
  if (typeof window !== 'undefined') window.__azAdminSocket = null;
}
