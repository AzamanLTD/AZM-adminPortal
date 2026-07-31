import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import TiltCard from '@/components/ui/TiltCard';

const COLOR_STYLES = {
  emerald: { color: 'var(--az-emerald)', soft: 'var(--az-emerald-soft)', glow: 'var(--az-emerald-glow)' },
  blue:    { color: 'var(--az-blue)',    soft: 'var(--az-blue-soft)',    glow: 'var(--az-blue-glow)' },
  amber:   { color: 'var(--az-amber)',   soft: 'var(--az-amber-soft)',   glow: 'var(--az-amber-soft)' },
  red:     { color: 'var(--az-red)',     soft: 'var(--az-red-soft)',     glow: 'var(--az-red-glow)' },
  violet:  { color: 'var(--az-violet)',  soft: 'var(--az-violet-soft)',  glow: 'var(--az-violet-glow)' },
  teal:    { color: 'var(--az-teal)',    soft: 'var(--az-teal-soft)',    glow: 'var(--az-teal-soft)' },
  purple:  { color: 'var(--az-violet)',  soft: 'var(--az-violet-soft)',  glow: 'var(--az-violet-glow)' },
  slate:   { color: 'var(--az-text-secondary)', soft: 'var(--az-surface-4)', glow: 'var(--az-surface-4)' },
};

export default function StatCard({ label, value, sub, trend, trendLabel, icon: Icon, color = 'emerald', critical, loading, onClick }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.emerald;

  if (loading) {
    return (
      <div className="az-card p-5 rounded-xl space-y-3">
        <div className="flex justify-between">
          <div className="az-skeleton h-3 w-24 rounded" />
          <div className="az-skeleton w-8 h-8 rounded-lg" />
        </div>
        <div className="az-skeleton h-7 w-32 rounded" />
        <div className="az-skeleton h-3 w-16 rounded" />
      </div>
    );
  }

  return (
    <TiltCard
      className={cn(
        'az-card rounded-xl p-5 flex flex-col gap-3 transition-colors',
        onClick && 'cursor-pointer',
        critical && 'az-card-red'
      )}
      intensity={6}
      glare={true}
    >
      <div className="flex items-start justify-between">
        <span className="text-ui-xs" style={{ color: 'var(--az-text-muted)' }}>{label}</span>
        {Icon && (
          <div
            className="p-1.5 rounded-lg border flex items-center justify-center"
            style={{
              background: styles.soft,
              borderColor: styles.glow,
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: styles.color }} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--az-text-primary)' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--az-text-muted)' }}>{sub}</p>}
      </div>
      {trend !== undefined && trend !== null && (
        <div
          className={cn('flex items-center gap-1 text-xs font-medium')}
          style={{ color: trend >= 0 ? 'var(--az-emerald)' : 'var(--az-red)' }}
        >
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(trend)}% {trendLabel || 'vs yesterday'}</span>
        </div>
      )}
    </TiltCard>
  );
}
