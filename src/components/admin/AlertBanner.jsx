// src/components/admin/AlertBanner.jsx
// =============================================================================
// AZAMAN ADMIN — real-time alert banner (A-02 / Phase J.2)
//
// Opens a Socket.IO connection to the backend using the admin's JWT, joins the
// 'admin_spy_room', and renders a stack of up to 5 animated alert strips at
// the very top of the admin shell. Pairs with the backend adminAlertService
// (B-11), which emits 'admin_alert' (and a few typed convenience events) into
// that room.
//
// Phase J.2 enhancements:
//   - Framer Motion spring entrance/exit animations
//   - Audio alert for HIGH/CRITICAL severity
//   - Additional event types: dispute:escalated, kyb:submitted, susu:defaulted,
//     admin:login_from_new_location
//   - formatAlertMessage helper for richer alert text
// =============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { X, AlertOctagon, AlertTriangle, Bell, Info } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://azm-backend.onrender.com';
const MAX_ALERTS = 5;
const AUTO_DISMISS_MS = 30_000;

// Severity → strip styling + where a click should take the operator.
const SEVERITY_STYLE = {
  CRITICAL: { bg: 'var(--f-bad-bg)', border: 'var(--f-bad)', text: 'var(--f-bad)', Icon: AlertOctagon },
  HIGH:     { bg: 'var(--f-warn-bg)', border: 'var(--f-warn)', text: 'var(--f-warn)', Icon: AlertTriangle },
  MEDIUM:   { bg: 'var(--f-info-bg)', border: 'var(--f-info)', text: 'var(--f-info)', Icon: Bell },
  LOW:      { bg: 'var(--f-ok-bg)', border: 'var(--f-ok)', text: 'var(--f-ok)', Icon: Info },
};

// Map an alert to the most relevant admin page.
function routeForAlert(alert) {
  switch (alert.type) {
    case 'LARGE_WITHDRAWAL_PENDING':
      return '/withdrawals';
    case 'DISPUTE_FILED':
    case 'DISPUTE_ESCALATED':
    case 'SUSPICIOUS_TRADE_PATTERN':
      return '/war-room';
    case 'KYC_MANUAL_REVIEW_REQUIRED':
      return '/users';
    case 'KYB_SUBMITTED':
      return '/business-kyb';
    case 'FIAT_POOL_LOW':
      return '/pools';
    case 'SUSU_DEFAULTED':
      return '/susu';
    case 'ADMIN_LOGIN_NEW_LOCATION':
      return '/config';
    default:
      return null;
  }
}

function formatAlertMessage(type, data = {}) {
  switch (type) {
    case 'DISPUTE_ESCALATED':
      return `Dispute escalated — GHS ${data.amount?.toFixed(2) ?? 'N/A'} at risk`;
    case 'LARGE_WITHDRAWAL_PENDING':
      return `Large withdrawal request: GHS ${data.amount?.toFixed(2) ?? 'N/A'} from @${data.username || 'user'}`;
    case 'KYB_SUBMITTED':
      return `New KYB submission from ${data.businessName || 'unknown business'}`;
    case 'SUSU_DEFAULTED':
      return `Susu default: ${data.memberName || 'member'} missed cycle ${data.cycleNumber ?? '?'}`;
    case 'ADMIN_LOGIN_NEW_LOCATION':
      return `Admin login from new location: ${data.location || 'unknown'}`;
    default:
      return data.message || '';
  }
}

let _seq = 0;
const nextId = () => `${Date.now()}_${_seq++}`;

export default function AlertBanner() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const audioRef = useRef(null);

  // Web Audio API beep for critical alerts — no audio file needed.
  const playAlertSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      // Cleanup context after sound finishes
      osc.onended = () => ctx.close();
    } catch {
      // AudioContext may not be available (SSR or permissions) — silently ignore
    }
  }, []);

  const dismiss = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  }, []);

  const pushAlert = useCallback((raw) => {
    const type = raw.type || 'GENERIC';
    const severity = (raw.severity || 'MEDIUM').toUpperCase();
    const alert = {
      _id: nextId(),
      type,
      severity,
      title: raw.title || formatAlertMessage(type, raw) || 'Alert',
      message: raw.message || formatAlertMessage(type, raw) || raw.title || '',
      timestamp: raw.timestamp || new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));

    // Play audio beep for high/critical severity
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      playAlertSound();
    }

    // Auto-dismiss after a while so the bar doesn't accumulate stale strips.
    setTimeout(() => dismiss(alert._id), AUTO_DISMISS_MS);
  }, [dismiss, playAlertSound]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return undefined;

    const socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
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

    // Phase J.2 — additional critical event types.
    socket.on('dispute:escalated', (d) =>
      pushAlert({
        type: 'DISPUTE_ESCALATED',
        severity: 'HIGH',
        ...d,
      }),
    );
    socket.on('kyb:submitted', (d) =>
      pushAlert({
        type: 'KYB_SUBMITTED',
        severity: 'MEDIUM',
        ...d,
      }),
    );
    socket.on('susu:defaulted', (d) =>
      pushAlert({
        type: 'SUSU_DEFAULTED',
        severity: 'HIGH',
        ...d,
      }),
    );
    socket.on('admin:login_from_new_location', (d) =>
      pushAlert({
        type: 'ADMIN_LOGIN_NEW_LOCATION',
        severity: 'CRITICAL',
        ...d,
      }),
    );

    return () => {
      socket.off('admin_alert', pushAlert);
      socket.off('dispute:escalated');
      socket.off('kyb:submitted');
      socket.off('susu:defaulted');
      socket.off('admin:login_from_new_location');
      socket.disconnect();
    };
  }, [pushAlert]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <AnimatePresence>
        {alerts.map((a) => {
          const s = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.MEDIUM;
          const route = routeForAlert(a);
          return (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={spring.toast}
              onClick={() => route && navigate(route)}
              className="flex items-center justify-between px-6 py-2.5 border-b text-sm pointer-events-auto"
              style={{
                background: s.bg,
                borderColor: s.border,
                color: s.text,
                cursor: route ? 'pointer' : 'default',
                
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <s.Icon className="w-4 h-4 flex-shrink-0" />
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
                  style={{ background: s.border, color: 'var(--f-bg)' }}
                >
                  {a.severity}
                </span>
                <span className="font-semibold flex-shrink-0">{a.title}</span>
                {a.message && a.message !== a.title && (
                  <span className="text-ink-3 truncate">— {a.message}</span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(a._id);
                }}
                className="p-1 rounded hover:bg-surface-sunken flex-shrink-0 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
