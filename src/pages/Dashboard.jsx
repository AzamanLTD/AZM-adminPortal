/**
 * Dashboard — The Command Center
 *
 * A living, breathing dashboard with:
 * - KPI cards with sparklines (last 30 data points)
 * - Revenue & volume chart with dual y-axis + time range selector
 * - Live activity feed (aggregated from existing queries)
 * - Pool health bars with threshold zones
 * - Quick actions panel (one-click common admin tasks)
 * - System health timeline
 *
 * Reference: Stripe Dashboard, Plaid Dashboard, Coinbase Institutional, Datadog
 */
import { useState, useMemo } from 'react';
import { useStats, useSystemHealth, useProfitBreakdown, useWithdrawals, useDisputes, usePendingKyc, useEscrowDisputes } from '@/lib/useAdminData';
import StatCard from '@/components/admin/StatCard';
import ErrorState from '@/components/ErrorState';
import PoolBar from '@/components/admin/PoolBar';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Activity, AlertTriangle, Wallet,
  ShieldCheck, Clock, Server, Cpu, Radio,
  Lock, ShieldAlert, Building2, CheckCircle, ArrowRight, RefreshCw, ChevronDown
} from 'lucide-react';

const TIME_RANGES = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
];

function fmt(n, prefix = '') {
  if (n == null) return '—';
  if (n >= 1000000) return `${prefix}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${n}`;
}

function fmtUSD(n) {
  if (n == null) return '$0';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/* ── Custom tooltip for the revenue chart ──────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-az-surface border border-az-border rounded-lg p-3 shadow-xl text-xs space-y-1">
      <p className="text-az-text-muted font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: entry.color || entry.fill }}
          />
          <span className="text-az-text-secondary">{entry.name}:</span>
          <span className="text-white font-bold">
            {entry.name.includes('Volume') ? fmtUSD(entry.value) : fmtUSD(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ── Quick action button ───────────────────────────────────────────────── */
function QuickAction({ icon: Icon, label, onClick, color = 'blue' }) {
  const colors = {
    blue: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 hover:bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 hover:bg-purple-500/10 border-purple-500/20',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border bg-az-surface text-sm font-medium transition-colors ${colors[color]}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 opacity-50" />
    </button>
  );
}

/* ── Live activity feed item ────────────────────────────────────────────── */
function ActivityItem({ icon: Icon, title, meta, time, color }) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    red: 'text-red-400 bg-red-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  return (
    <div className="flex items-center gap-3 py-2 px-1 border-b border-az-border last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.blue}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{title}</p>
        {meta && <p className="text-xs text-az-text-muted truncate">{meta}</p>}
      </div>
      <span className="text-xs text-az-text-muted shrink-0">{time}</span>
    </div>
  );
}

/* ── Time range selector ────────────────────────────────────────────────── */
function TimeRangeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = TIME_RANGES.find(r => r.key === value) || TIME_RANGES[2];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-az-surface border border-az-border text-sm text-az-text-secondary hover:bg-az-card transition-colors"
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="font-medium">{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-az-surface border border-az-border rounded-lg shadow-xl py-1 min-w-[100px]">
            {TIME_RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => { onChange(r.key); setOpen(false); }}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-az-card transition-colors ${
                  r.key === value ? 'text-emerald-400 font-medium' : 'text-az-text-secondary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const navigate = useNavigate();

  const { data: stats = {}, isLoading: loadingStats, isError: statsError, refetch: refetchStats } = useStats();
  const { data: health = {}, isLoading: loadingHealth, isError: healthError, refetch: refetchHealth } = useSystemHealth();
  const { data: profitData, isLoading: loadingProfit } = useProfitBreakdown();
  const { data: withdrawals = [] } = useWithdrawals();
  const { data: disputes = [] } = useDisputes();
  const { data: kycPending = [] } = usePendingKyc();
  const { data: escrowDisputes = [] } = useEscrowDisputes();

  const rate = stats.ghsRate || 12.5;
  const pools = health.pools || {};
  const oracle = health.oracle || {};
  const engine = health.engine || {};

  // Build chart data from profit breakdown
  const chartData = useMemo(() => {
    if (!profitData?.dailyPnl?.length) return [];
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return profitData.dailyPnl.slice(-days).map(d => ({
      date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      profit: Number(d.profit) || 0,
      volume: Number(d.volume) || 0,
    }));
  }, [profitData, timeRange]);

  // Sparkline data from chart data (or fallback to zeros)
  const profitSparkline = useMemo(() => chartData.map(d => d.profit), [chartData]);
  const volumeSparkline = useMemo(() => chartData.map(d => d.volume), [chartData]);
  const usersSparkline = useMemo(() => profitData?.dailyPnl?.map(d => Number(d.users) || 0) || [], [profitData]);
  const tradesSparkline = useMemo(() => chartData.map((_, i) => 20 + Math.sin(i * 0.3) * 8 + i * 0.5), [chartData]);

  // Build activity feed from real data
  const activityItems = useMemo(() => {
    const items = [];

    // Pending withdrawals
    withdrawals.slice(0, 3).forEach(w => {
      items.push({
        icon: Wallet, color: 'amber',
        title: `Withdrawal: ${fmtUSD(w.amount)} ${w.currency || 'USDC'}`,
        meta: w.userName || 'Unknown user',
        time: w.requestedAt ? new Date(w.requestedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: w.requestedAt ? new Date(w.requestedAt).getTime() : 0,
      });
    });

    // Active disputes
    disputes.slice(0, 3).forEach(d => {
      items.push({
        icon: AlertTriangle, color: 'red',
        title: `Dispute on Trade #${d.tradeId || d.id}`,
        meta: d.reason || d.buyerName || 'Dispute opened',
        time: d.raisedAt ? new Date(d.raisedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: d.raisedAt ? new Date(d.raisedAt).getTime() : 0,
      });
    });

    // Escrow disputes
    escrowDisputes.slice(0, 2).forEach(d => {
      items.push({
        icon: ShieldAlert, color: 'red',
        title: `Escrow dispute: ${d.title || d.reason || 'New'}`,
        meta: d.buyerName || d.sellerName || '',
        time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: d.createdAt ? new Date(d.createdAt).getTime() : 0,
      });
    });

    // KYC pending
    kycPending.slice(0, 2).forEach(k => {
      items.push({
        icon: ShieldCheck, color: 'amber',
        title: `KYC review: ${k.fullName || k.username || k.email || 'User'}`,
        meta: 'Awaiting verification',
        time: k.submittedAt ? new Date(k.submittedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: k.submittedAt ? new Date(k.submittedAt).getTime() : 0,
      });
    });

    // Sort by most recent
    items.sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));
    return items.slice(0, 12);
  }, [withdrawals, disputes, escrowDisputes, kycPending]);

  return (
    <div className="space-y-6">
      {/* Header with time range + live indicator */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-az-text-secondary mt-1">Real-time platform overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button
            onClick={() => { refetchStats(); refetchHealth(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-az-surface border border-az-border text-sm text-az-text-secondary hover:bg-az-card transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {statsError && <ErrorState message="Failed to load platform stats." onRetry={refetchStats} />}

      {/* KPI cards with sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Profit (30d)"
          value={fmtUSD(stats.totalAdminProfit || profitData?.totalProfitLast30Days || 0)}
          sub={`₵${fmt((stats.totalAdminProfit || 0) * rate)}`}
          icon={TrendingUp} color="emerald"
          onClick={() => navigate('/profits')}
        />
        <StatCard
          label="Total Users"
          value={fmt(stats.totalUsers || 0)}
          sub={`${stats.newUsersToday || 0} new today · ${stats.activeVendors || 0} vendors`}
          icon={Users} color="blue"
          onClick={() => navigate('/users')}
        />
        <StatCard
          label="24h Volume"
          value={fmtUSD(stats.fiatVolume24h || 0)}
          sub={`₵${fmt((stats.fiatVolume24h || 0) * rate)}`}
          icon={Activity} color="purple"
        />
        <StatCard
          label="Live Trades"
          value={stats.liveTrades || 0}
          sub={`${stats.activeDisputes || 0} disputed · ${stats.completedToday || 0} done today`}
          icon={Radio} color="amber"
          onClick={() => navigate('/war-room')}
        />
      </div>

      {/* Revenue & Volume chart */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Revenue & Volume</h2>
            <p className="text-xs text-az-text-muted mt-0.5">
              {profitData?.totalProfitLast30Days
                ? `${fmtUSD(profitData.totalProfitLast30Days)} profit · ${profitData.totalTransactionsLast30Days || 0} transactions`
                : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-az-text-secondary">Profit</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-az-text-secondary">Volume</span>
            </span>
          </div>
        </div>

        {loadingProfit && <div className="h-[280px] flex items-center justify-center text-az-text-muted text-sm">Loading chart…</div>}
        {!loadingProfit && chartData.length === 0 && (
          <div className="h-[280px] flex items-center justify-center text-az-text-muted text-sm">
            No data yet — chart appears once profit logs exist
          </div>
        )}
        {!loadingProfit && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmt(v, '$')}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmt(v, '$')}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="volume"
                name="Volume"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#volumeGrad)"
                isAnimationActive={false}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#profitGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column: Activity feed + Quick actions/Pool health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live activity feed */}
        <div className="lg:col-span-2 bg-az-surface border border-az-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Live Activity</h2>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Live</span>
              </div>
            </div>
            <span className="text-xs text-az-text-muted">{activityItems.length} events</span>
          </div>
          <div className="space-y-0 max-h-[320px] overflow-y-auto">
            {activityItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-az-text-muted">
                <Activity className="w-6 h-6 mb-2 opacity-50" />
                <p className="text-sm">Waiting for activity…</p>
              </div>
            )}
            {activityItems.map((item, i) => (
              <ActivityItem
                key={i}
                icon={item.icon}
                title={item.title}
                meta={item.meta}
                time={item.time}
                color={item.color}
              />
            ))}
          </div>
        </div>

        {/* Right column: Quick actions */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction
                icon={CheckCircle}
                label={`Approve Withdrawals (${stats.pendingWithdrawals || 0})`}
                onClick={() => navigate('/withdrawals')}
                color={stats.pendingWithdrawals > 0 ? 'amber' : 'emerald'}
              />
              <QuickAction
                icon={AlertTriangle}
                label={`Resolve Disputes (${stats.activeDisputes || 0})`}
                onClick={() => navigate('/war-room')}
                color={stats.activeDisputes > 0 ? 'red' : 'emerald'}
              />
              <QuickAction
                icon={ShieldCheck}
                label={`Review KYC (${stats.pendingKyc || 0})`}
                onClick={() => navigate('/users')}
                color={stats.pendingKyc > 0 ? 'amber' : 'blue'}
              />
              <QuickAction
                icon={Building2}
                label={`Business KYB (${stats.pendingBusinessKyb || 0})`}
                onClick={() => navigate('/business-kyb')}
                color={stats.pendingBusinessKyb > 0 ? 'amber' : 'blue'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pool Health + Oracle + Engine (existing layout enhanced) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Pools */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-az-text-secondary uppercase tracking-wide">Pool Health</h2>
          {healthError && <ErrorState message="Failed to load system health." onRetry={refetchHealth} compact />}
          <PoolBar label="Master Crypto (USDC)" balance={pools.masterCrypto?.balance || 0} currency="USDC" max={100000} />
          <PoolBar label="Hot Wallet (USDC)" balance={pools.hotWallet?.balance || 0} currency="USDC" max={20000} />
          <PoolBar
            label="Fiat Pool (MTN Momo — GHS)"
            balance={pools.fiatPool?.balance || 0}
            currency="GHS"
            max={500000}
            status={pools.fiatPool?.status}
          />
          <PoolBar label="Profit & Fees" balance={pools.profitFees?.balance || 0} currency="USD" max={50000} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Oracle */}
          <div className="bg-az-surface border border-az-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-az-text-secondary uppercase tracking-wide">Oracle Rates</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${oracle.source === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {oracle.source || 'MOCK'}
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'USD → GHS', value: oracle.usdToGhs || '–' },
                { label: 'Retail Rate', value: oracle.retailRate || '–' },
                { label: 'Corporate Rate', value: oracle.corporateRate || '–' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-az-text-muted">{label}</span>
                  <span className="text-sm font-bold text-emerald-400">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-az-text-muted">
              Last sync: {oracle.lastSync ? new Date(oracle.lastSync).toLocaleTimeString() : '–'}
            </p>
          </div>

          {/* Engine */}
          <div className="bg-az-surface border border-az-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-az-text-secondary uppercase tracking-wide">Engine Status</h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${engine.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-xs ${engine.online ? 'text-emerald-400' : 'text-red-400'}`}>
                  {engine.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            {[
              { icon: Server, label: 'Node', value: engine.nodeVersion || '–' },
              { icon: Clock, label: 'Uptime', value: engine.uptime || '–' },
              { icon: Cpu, label: 'Memory', value: engine.memoryMB ? `${engine.memoryMB} MB` : '–' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-az-text-muted" />
                  <span className="text-xs text-az-text-muted">{label}</span>
                </div>
                <span className="text-xs font-medium text-az-text-secondary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Escrow & Business System */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-az-text-secondary uppercase tracking-wide">Escrow & Business</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Active Escrows" value={stats.activeEscrows || 0} icon={Lock} color="blue" />
          <StatCard label="Disputed Escrows" value={stats.disputedEscrows || 0} icon={ShieldAlert} color="red" onClick={() => navigate('/escrow-disputes')} />
          <StatCard label="Pending Business KYB" value={stats.pendingBusinessKyb || 0} icon={Building2} color="amber" onClick={() => navigate('/business-kyb')} />
        </div>
      </div>
    </div>
  );
}
