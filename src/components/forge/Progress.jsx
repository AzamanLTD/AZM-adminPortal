export function Progress({ value = 0, max = 100, className = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-1.5 rounded-full bg-surface-sunken overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-tint transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
