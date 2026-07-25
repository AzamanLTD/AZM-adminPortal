import { cn } from '@/lib/utils';

export default function PoolBar({ label, balance, currency = 'USDC', max = 100000, status }) {
  const fraction = max > 0 ? Math.min(balance / max, 1) : 0;
  const statusColor = status === 'WARNING' ? 'bg-amber-500' : status === 'CRITICAL' ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <div className="bg-az-surface border border-az-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-az-text-secondary font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            {currency === 'GHS' ? '₵' : '$'}{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <div className={cn('w-2 h-2 rounded-full', statusColor)} />
        </div>
      </div>
      <div className="w-full h-1.5 bg-az-card rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', statusColor)}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
