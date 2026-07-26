// src/components/admin/AlertBanner.jsx
// =============================================================================
// AZAMAN ADMIN — real-time alert banner (A-02)
//
// Opens a Socket.IO connection to the backend using the admin's JWT, joins the
// 'admin_spy_room', and renders a stack of up to 5 transient alert strips at
// the very top of the admin shell. Pairs with the backend adminAlertService
// (B-11), which emits 'admin_alert' (and a few typed convenience events) into
// that room.
//
// Self-contained: it manages its own socket lifecycle and alert queue, so
// integrating it is a single <AlertBanner/> at the top of Layout. It degrades
// gracefully — if the socket can't connect (no token, backend down), it simply
// renders nothing.
// =============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { X } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://azaman-backend-9d3u.onrender.com';
const MAX_ALERTS = 5;
const AUTO_DISMISS_MS = 30_000;

// Severity → strip styling + where a click should take the operator.
const SEVERITY_STYLE = {
  CRITICAL: { bg: '#f43f5e22', border: '#f43f5e', text: '#f43f5e' },
  HIGH:     { bg: '#f59e0b22', border: '#f59e0b', text: '#f59e0b' },
  MEDIUM:   { bg: '#4f8ef722', border: '#4f8ef7', text: '#4f8ef7' },
  LOW:      { bg: '#00d97e22', border: '#00d97e', text: '#00d97e' },
};

// Map an alert to the most relevant admin page.
function routeForAlert(alert) {
  switch (alert.type) {
    case 'LARGE_WITHDRAWAL_PENDING':
      return '/withdrawals';
    case 'DISPUTE_FILED':
    case 'SUSPICIOUS_TRADE_PATTERN':
      return '/war-room';
    case 'KYC_MANUAL_REVIEW_REQUIRED':
      return '/users';
    case 'FIAT_POOL_LOW':
      return '/pools';
    default:
      return null;
  }
}

let _seq = 0;
const nextId = () => `${Date.now()}_${_seq++}`;

export default function AlertBanner() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);

  const dismiss = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  }, []);

  const pushAlert = useCallback((raw) => {
    const alert = {
      _id: nextId(),
      type: raw.type || 'GENERIC',
      severity: (raw.severity || 'MEDIUM').toUpperCase(),
      title: raw.title || raw.message || 'Alert',
      message: raw.message || raw.title || '',
      timestamp: raw.timestamp || new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));
    // Auto-dismiss after a while so the bar doesn't accumulate stale strips.
    setTimeout(() => dismiss(alert._id), AUTO_DISMISS_MS);
  }, [dismiss]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return undefined;

    const socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      // The backend joins admins to admin_spy_room on this event.
      socket.emit('join_admin_spy');
    });

    // Primary channel from adminAlertService.
    socket.on('admin_alert', pushAlert);

    // Typed convenience events → normalise into the same banner shape.
    socket.on('fiat_pool_low', (d) =>
      pushAlert({
        type: 'FIAT_POOL_LOW',
        severity: 'CRITICAL',
        title: 'Fiat pool below threshold',
        message: `Balance ${d?.currentBalance} (threshold ${d?.threshold})`,
      }),
    );
    socket.on('large_withdrawal_pending', (d) =>
      pushAlert({
        type: 'LARGE_WITHDRAWAL_PENDING',
        severity: 'HIGH',
        title: 'Large withdrawal pending',
        message: `#${d?.withdrawalId} — ${d?.amount} (user ${d?.userId})`,
      }),
    );
    socket.on('vendor_application_new', (d) =>
      pushAlert({
        type: 'VENDOR_APPLICATION_NEW',
        severity: 'MEDIUM',
        title: 'New vendor application',
        message: `${d?.username || 'applicant'} (#${d?.applicationId})`,
      }),
    );

    return () => {
      socket.off('admin_alert', pushAlert);
      socket.disconnect();
    };
  }, [pushAlert]);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col">
      {alerts.map((a) => {
        const s = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.MEDIUM;
        const route = routeForAlert(a);
        return (
          <div
            key={a._id}
            onClick={() => route && navigate(route)}
            className="flex items-center justify-between px-6 py-2 border-b text-sm"
            style={{
              background: s.bg,
              borderColor: s.border,
              color: s.text,
              cursor: route ? 'pointer' : 'default',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
                style={{ background: s.border, color: '#0a0a0f' }}
              >
                {a.severity}
              </span>
              <span className="font-semibold flex-shrink-0">{a.title}</span>
              {a.message && (
                <span className="text-[#b8b8c8] truncate">— {a.message}</span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss(a._id);
              }}
              className="p-1 rounded hover:bg-black/20 flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
