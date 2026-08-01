import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard — Klaviyo / Sentry style.
 * Props:
 *   label       — string, e.g. "Total Users"
 *   value       — string | number, formatted already (e.g. "1,234")
 *   delta       — number (%), positive = good, negative = bad
 *   deltaLabel  — string, e.g. "vs last week"
 *   icon        — Lucide icon component
 *   accent      — 'emerald' | 'red' | 'amber' | 'blue' | 'violet'
 *   loading     — boolean
 */
export default function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  accent = 'emerald',
  loading = false,
}) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const isNeutral  = delta === 0;

  const accentMap = {
    emerald: {
      iconBg:   'var(--f-ok-bg)',
      iconText: 'var(--f-ok)',
      border:   'var(--f-ok)',
    },
    red: {
      iconBg:   'var(--f-bad-bg)',
      iconText: 'var(--f-bad)',
      border:   'rgba(220,38,38,0.18)',
    },
    amber: {
      iconBg:   'var(--f-warn-bg)',
      iconText: 'var(--f-warn)',
      border:   'rgba(217,119,6,0.18)',
    },
    blue: {
      iconBg:   'var(--f-info-bg)',
      iconText: 'var(--f-info)',
      border:   'rgba(37,99,235,0.18)',
    },
    violet: {
      iconBg:   'var(--f-surface-sunken)',
      iconText: 'var(--f-tint-color)',
      border:   'rgba(108,79,209,0.18)',
    },
  };

  const colors = accentMap[accent] || accentMap.emerald;

  if (loading) {
    return (
      <div className="az-stat-card">
        <div className="flex items-start justify-between mb-3">
          <div className="az-skeleton h-3 w-24 rounded" />
          <div className="az-skeleton w-7 h-7 rounded-md" />
        </div>
        <div className="az-skeleton h-7 w-20 rounded mb-2" />
        <div className="az-skeleton h-3 w-16 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      className="az-stat-card border-t-2"
      style={{ borderTopColor: 'transparent' }}
      whileHover={{
        y: -2,
        borderTopColor: colors.iconText,
        boxShadow: 'var(--f-shadow-sm)',
      }}
      transition={{ duration: 0.15 }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--f-text-3)' }}
        >
          {label}
        </p>
        {Icon && (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: colors.iconBg }}
          >
            <Icon style={{ width: 14, height: 14, color: colors.iconText }} />
          </div>
        )}
      </div>

      {/* Value */}
      <p
        className="text-[22px] font-bold font-mono tabular-nums mb-2"
        style={{ color: 'var(--f-text)' }}
      >
        {value ?? '—'}
      </p>

      {/* Delta */}
      {delta !== undefined && (
        <div className="flex items-center gap-1.5">
          {isPositive && <TrendingUp  style={{ width: 12, height: 12, color: 'var(--f-ok)' }} />}
          {isNegative && <TrendingDown style={{ width: 12, height: 12, color: 'var(--f-bad)'  }} />}
          {isNeutral  && <Minus        style={{ width: 12, height: 12, color: 'var(--f-text-3)' }} />}
          <span
            className="text-xs font-semibold"
            style={{
              color: isPositive
                ? 'var(--f-ok)'
                : isNegative
                ? 'var(--f-bad)'
                : 'var(--f-text-3)',
            }}
          >
            {delta > 0 ? '+' : ''}{delta}%
          </span>
          {deltaLabel && (
            <span className="text-xs" style={{ color: 'var(--f-text-3)' }}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
