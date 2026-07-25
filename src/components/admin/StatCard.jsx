import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ label, value, sub, trend, icon: Icon, color = 'emerald', onClick }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    slate: 'text-az-text-secondary bg-az-text-muted/10 border-az-text-muted/20',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-az-surface border border-az-border rounded-xl p-4 flex flex-col gap-3',
        onClick && 'cursor-pointer hover:border-az-border-bright transition-colors'
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs text-az-text-muted font-medium uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className={cn('p-1.5 rounded-lg border', colors[color])}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-az-text-muted mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(trend)}% vs yesterday</span>
        </div>
      )}
    </div>
  );
}