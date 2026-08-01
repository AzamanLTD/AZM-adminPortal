import { useProfitBreakdown, useStats } from '@/lib/useAdminData';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import StatCard from '@/components/admin/StatCard';
import ErrorState from '@/components/ErrorState';
import { TrendingUp, DollarSign, Hash } from 'lucide-react';

const SOURCE_COLORS = {
  P2P_MARGIN: '#10b981',
  EXIT_FEE: '#6366f1',
  GAS_FEE_REVENUE: 'var(--f-warn)',
  ARBITRAGE_SPREAD: '#ec4899',
};

const CustomTooltip = ({ active, payload, label, rate }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--f-surface-sunken)] border border-line rounded-lg p-3 text-xs">
      <p className="text-ink-2 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          ${p.value?.toLocaleString()} / ₵{((p.value || 0) * (rate || 12.5)).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Profits() {
  const { data: breakdown = {}, isLoading, isError, refetch } = useProfitBreakdown();
  const { data: stats = {} } = useStats();
  const rate = stats.ghsRate || 12.5;

  const { totalProfit30d = 0, avgDailyRevenue = 0, totalTransactions30d = 0, dailyPnL = [], bySource = [] } = breakdown;
  const maxSource = Math.max(...bySource.map((s) => s.usd), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--f-text)]">Revenue Dashboard</h1>
        <p className="text-sm text-ink-2 mt-1">Last 30 days — all amounts in USD and GHS</p>
      </div>

      {isError && <ErrorState message="Failed to load revenue data." onRetry={refetch} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Profit (30d)" value={`$${totalProfit30d.toLocaleString()}`} sub={`₵${(totalProfit30d * rate).toLocaleString()}`} icon={TrendingUp} color="emerald" />
        <StatCard label="Avg Daily Revenue" value={`$${avgDailyRevenue.toLocaleString()}`} sub={`₵${(avgDailyRevenue * rate).toLocaleString()}`} icon={DollarSign} color="blue" />
        <StatCard label="Total Transactions" value={totalTransactions30d.toLocaleString()} icon={Hash} color="purple" />
      </div>

      {/* PnL Chart */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink-2 mb-4">Daily PnL — 30 Days</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dailyPnL}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip content={<CustomTooltip rate={rate} />} />
            <Line type="monotone" dataKey="usd" stroke="var(--f-ok)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by source */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink-2 mb-5">Revenue by Source</h2>
        <div className="space-y-4">
          {bySource.map(({ source, usd, ghs }) => {
            const pct = Math.round((usd / maxSource) * 100);
            return (
              <div key={source}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-ink-2">{source.replace(/_/g, ' ')}</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--f-text)]">${usd.toLocaleString()}</span>
                    <span className="text-xs text-ink-3 ml-2">₵{ghs.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-full bg-[var(--f-surface-sunken)] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: SOURCE_COLORS[source] || '#6366f1' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GHS Bar chart */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink-2 mb-4">Daily Revenue in GHS</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyPnL}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [`₵${v.toLocaleString()}`, 'GHS']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="ghs" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}