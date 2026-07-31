export default function PoolBar({ label, balance, currency = 'USDC', max = 100000, status }) {
  const fraction = max > 0 ? Math.min(balance / max, 1) : 0;
  const barColor = status === 'WARNING' ? 'var(--az-amber)' : status === 'CRITICAL' ? 'var(--az-red)' : 'var(--az-emerald)';
  const barSoft  = status === 'WARNING' ? 'var(--az-amber-soft)' : status === 'CRITICAL' ? 'var(--az-red-soft)' : 'var(--az-emerald-soft)';

  return (
    <div className="az-card rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--az-text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold az-mono" style={{ color: 'var(--az-text-primary)' }}>
            {currency === 'GHS' ? '₵' : '$'}{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <div className="w-2 h-2 rounded-full" style={{ background: barColor }} />
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--az-surface-4)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${fraction * 100}%`, background: barColor, boxShadow: `0 0 8px ${barSoft}` }}
        />
      </div>
    </div>
  );
}
