// src/components/forge/SlaTimer.jsx
// Shared SLA timer — single 30s interval for all rows, not one per row.
import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { getSLA } from '@/lib/disputes';

const SLA_STYLES = {
  normal: { badge: 'bg-ok-bg text-ok border-ok', dot: 'bg-ok' },
  warning: { badge: 'bg-warn-bg text-warn border-warn', dot: 'bg-warn' },
  critical: { badge: 'bg-bad-bg text-bad border-bad', dot: 'bg-bad' },
};

// Single shared interval — all SlaTimer instances subscribe to one tick
let sharedTick = 0;
const subscribers = new Set();
let intervalId = null;

function ensureInterval() {
  if (intervalId) return;
  intervalId = setInterval(() => {
    sharedTick++;
    subscribers.forEach(fn => fn(sharedTick));
  }, 30000);
}

function stopInterval() {
  if (intervalId && subscribers.size === 0) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function SlaTimer({ createdAt }) {
  const [, setTick] = useState(0);
  const fnRef = useRef(() => setTick(t => t + 1));

  useEffect(() => {
    // Use the stable ref for subscription
    const fn = fnRef.current;
    subscribers.add(fn);
    ensureInterval();
    return () => {
      subscribers.delete(fn);
      stopInterval();
    };
  }, []);

  const sla = getSLA(createdAt);
  const style = SLA_STYLES[sla.level] || SLA_STYLES.normal;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${sla.level === 'critical' ? 'animate-pulse' : ''}`} />
      <Clock className="w-3 h-3" />
      {sla.label}
    </span>
  );
}

export default SlaTimer;
