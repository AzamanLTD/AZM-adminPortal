/**
 * Dashboard — The Command Center (Obsidian Glass)
 *
 * Theme-aware, animated, production-grade.
 * Reference: Stripe Dashboard, Datadog, Sentry
 */
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { cardVariants, listVariants, listItemVariants, spring } from '@/lib/motion';

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

/** Read a CSS variable's computed value (for Recharts which can't use CSS vars in SVG attrs) */
function useTokenVar(name, fallback) {
  const [val, setVal] = useState(fallback);
  useEffect(() => {
    const update = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) setVal(v.startsWith('#') ? v : v);
    };
    update();
    // Re-read on theme change
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [name]);
  return val;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 shadow-xl text-xs space-y-1"
      style={{
        background: 'var(--az-surface-3)',
        border: '1px solid var(--az-border-bright)',
      }}>
      <p className="font-medium" style={{ color: 'var(--az-text-muted)' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color || entry.fill }} />
          <span style={{ color: 'var(--az-text-secondary)' }}>{entry.name}:</span>
          <span className="font-bold" style={{ color: 'var(--az-text-primary)' }}>{fmtUSD(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, color = 'blue' }) {
  const colorMap = {
    blue:    { c: 'var(--az-blue)',    s: 'var(--az-blue-soft)' },
    emerald: { c: 'var(--az-emerald)', s: 'var(--az-emerald-soft)' },
    amber:   { c: 'var(--az-amber)',   s: 'var(--az-amber-soft)' },
    red:     { c: 'var(--az-red)',     s: 'var(--az-red-soft)' },
    violet:  { c: 'var(--az-violet)',  s: 'var(--az-violet-soft)' },
    purple:  { c: 'var(--az-violet)',  s: 'var(--az-violet-soft)' },
  };
  const st = colorMap[color] || colorMap.blue;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
      style={{
        background: 'var(--az-surface-2)',
        border: '1px solid var(--az-border)',
        color: st.c,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = st.s; e.currentTarget.style.borderColor = st.c + '40'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--az-surface-2)'; e.currentTarget.style.borderColor = 'var(--az-border)'; }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left" style={{ color: 'var(--az-text-primary)' }}>{label}</span>
      <ArrowRight className="w-3.5 h-3.5 opacity-50" />
    </motion.button>
  );
}

function ActivityItem({ icon: Icon, title, meta, time, color }) {
  const colorMap = {
    emerald: 'var(--az-emerald)',
    blue:    'var(--az-blue)',
    red:     'var(--az-red)',
    amber:   'var(--az-amber)',
    violet:  'var(--az-violet)',
    purple:  'var(--az-violet)',
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <motion.div
      variants={listItemVariants}
      className="flex items-center gap-3 py-2 px-1 border-b last:border-0"
      style={{ borderColor: 'var(--az-border)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: c + '15', color: c }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--az-text-primary)' }}>{title}</p>
        {meta && <p className="text-xs truncate" style={{ color: 'var(--az-text-muted)' }}>{meta}</p>}
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--az-text-muted)' }}>{time}</span>
    </motion.div>
  );
}

function TimeRangeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = TIME_RANGES.find(r => r.key === value) || TIME_RANGES[2];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{
          background: 'var(--az-surface-3)',
          border: '1px solid var(--az-border)',
          color: 'var(--az-text-secondary)',
        }}
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="font-medium">{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 rounded-lg shadow-xl py-1 min-w-[100px]"
            style={{ background: 'var(--az-surface-3)', border: '1px solid var(--az-border-bright)' }}>
            {TIME_RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => { onChange(r.key); setOpen(false); }}
                className="w-full px-3 py-1.5 text-left text-sm transition-colors"
                style={{
                  color: r.key === value ? 'var(--az-emerald)' : 'var(--az-text-secondary)',
                  fontWeight: r.key === value ? 600 : 400,
                }}
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

  // Theme-aware chart colors
  const emeraldColor = useTokenVar('--az-emerald', '#00D97E');
  const blueColor    = useTokenVar('--az-blue', '#4F8EF7');
  const borderColor  = useTokenVar('--az-border', 'rgba(255,255,255,0.07)');
  const mutedColor   = useTokenVar('--az-text-muted', '#4A4A6A');

  const rate = stats.ghsRate || 12.5;
  const pools = health.pools || {};
  const oracle = health.oracle || {};
  const engine = health.engine || {};

  const chartData = useMemo(() => {
    if (!profitData?.dailyPnl?.length) return [];
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return profitData.dailyPnl.slice(-days).map(d => ({
      date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      profit: Number(d.profit) || 0,
      volume: Number(d.volume) || 0,
    }));
  }, [profitData, timeRange]);

  const activityItems = useMemo(() => {
    const items = [];
    withdrawals.slice(0, 3).forEach(w => {
      items.push({
        icon: Wallet, color: 'amber',
        title: `Withdrawal: ${fmtUSD(w.amount)} ${w.currency || 'USDC'}`,
        meta: w.userName || 'Unknown user',
        time: w.requestedAt ? new Date(w.requestedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: w.requestedAt ? new Date(w.requestedAt).getTime() : 0,
      });
    });
    disputes.slice(0, 3).forEach(d => {
      items.push({
        icon: AlertTriangle, color: 'red',
        title: `Dispute on Trade #${d.tradeId || d.id}`,
        meta: d.reason || d.buyerName || 'Dispute opened',
        time: d.raisedAt ? new Date(d.raisedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: d.raisedAt ? new Date(d.raisedAt).getTime() : 0,
      });
    });
    escrowDisputes.slice(0, 2).forEach(d => {
      items.push({
        icon: ShieldAlert, color: 'red',
        title: `Escrow dispute: ${d.title || d.reason || 'New'}`,
        meta: d.buyerName || d.sellerName || '',
        time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: d.createdAt ? new Date(d.createdAt).getTime() : 0,
      });
    });
    kycPending.slice(0, 2).forEach(k => {
      items.push({
        icon: ShieldCheck, color: 'amber',
        title: `KYC review: ${k.fullName || k.username || k.email || 'User'}`,
        meta: 'Awaiting verification',
        time: k.submittedAt ? new Date(k.submittedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '',
        sortKey: k.submittedAt ? new Date(k.submittedAt).getTime() : 0,
      });
    });
    items.sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));
    return items.slice(0, 12);
  }, [withdrawals, disputes, escrowDisputes, kycPending]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--az-text-primary)' }}>Command Center</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--az-text-secondary)' }}>Real-time platform overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full az-pulse" style={{ background: 'var(--az-emerald)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--az-emerald)' }}>Live</span>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button
            onClick={() => { refetchStats(); refetchHealth(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ background: 'var(--az-surface-3)', border: '1px solid var(--az-border)', color: 'var(--az-text-secondary)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {statsError && <ErrorState message="Failed to load platform stats." onRetry={refetchStats} />}

      {/* KPI cards with staggered entrance */}
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div variants={cardVariants}>
          <StatCard label="Total Profit (30d)" value={fmtUSD(stats.totalAdminProfit || profitData?.totalProfitLast30Days || 0)} sub={`₵${fmt((stats.totalAdminProfit || 0) * rate)}`} icon={TrendingUp} color="emerald" onClick={() => navigate('/profits')} />
        </motion.div>
        <motion.div variants={cardVariants}>
          <StatCard label="Total Users" value={fmt(stats.totalUsers || 0)} sub={`${stats.newUsersToday || 0} new today · ${stats.activeVendors || 0} vendors`} icon={Users} color="blue" onClick={() => navigate('/users')} />
        </motion.div>
        <motion.div variants={cardVariants}>
          <StatCard label="24h Volume" value={fmtUSD(stats.fiatVolume24h || 0)} sub={`₵${fmt((stats.fiatVolume24h || 0) * rate)}`} icon={Activity} color="violet" />
        </motion.div>
        <motion.div variants={cardVariants}>
          <StatCard label="Live Trades" value={stats.liveTrades || 0} sub={`${stats.activeDisputes || 0} disputed · ${stats.completedToday || 0} done today`} icon={Radio} color="amber" onClick={() => navigate('/war-room')} />
        </motion.div>
      </motion.div>

      {/* Revenue & Volume chart */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="az-card rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--az-text-primary)' }}>Revenue & Volume</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--az-text-muted)' }}>
              {profitData?.totalProfitLast30Days ? `${fmtUSD(profitData.totalProfitLast30Days)} profit · ${profitData.totalTransactionsLast30Days || 0} transactions` : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: emeraldColor }} />
              <span style={{ color: 'var(--az-text-secondary)' }}>Profit</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: blueColor }} />
              <span style={{ color: 'var(--az-text-secondary)' }}>Volume</span>
            </span>
          </div>
        </div>

        {loadingProfit && <div className="h-[280px] flex items-center justify-center text-sm" style={{ color: 'var(--az-text-muted)' }}>Loading chart…</div>}
        {!loadingProfit && chartData.length === 0 && (
          <div className="h-[280px] flex items-center justify-center text-sm" style={{ color: 'var(--az-text-muted)' }}>
            No data yet — chart appears once profit logs exist
          </div>
        )}
        {!loadingProfit && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={emeraldColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={emeraldColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={blueColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={blueColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
              <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis yAxisId="left" tick={{ fill: mutedColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v, '$')} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: mutedColor, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v, '$')} />
              <Tooltip content={<ChartTooltip />} />
              <Area yAxisId="right" type="monotone" dataKey="volume" name="Volume" stroke={blueColor} strokeWidth={2} fill="url(#volumeGrad)" isAnimationActive={false} />
              <Area yAxisId="left" type="monotone" dataKey="profit" name="Profit" stroke={emeraldColor} strokeWidth={2} fill="url(#profitGrad)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Two-column: Activity feed + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live activity feed */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 az-card rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--az-text-primary)' }}>Live Activity</h2>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full az-pulse" style={{ background: 'var(--az-emerald)' }} />
                <span className="text-xs" style={{ color: 'var(--az-emerald)' }}>Live</span>
              </div>
            </div>
            <span className="text-xs" style={{ color: 'var(--az-text-muted)' }}>{activityItems.length} events</span>
          </div>
          <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-0 max-h-[320px] overflow-y-auto">
            {activityItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--az-text-muted)' }}>
                <Activity className="w-6 h-6 mb-2 opacity-50" />
                <p className="text-sm">Waiting for activity…</p>
              </div>
            )}
            {activityItems.map((item, i) => (
              <ActivityItem key={i} icon={item.icon} title={item.title} meta={item.meta} time={item.time} color={item.color} />
            ))}
          </motion.div>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible" className="space-y-4">
          <div className="az-card rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--az-text-primary)' }}>Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction icon={CheckCircle} label={`Approve Withdrawals (${stats.pendingWithdrawals || 0})`} onClick={() => navigate('/withdrawals')} color={stats.pendingWithdrawals > 0 ? 'amber' : 'emerald'} />
              <QuickAction icon={AlertTriangle} label={`Resolve Disputes (${stats.activeDisputes || 0})`} onClick={() => navigate('/war-room')} color={stats.activeDisputes > 0 ? 'red' : 'blue'} />
              <QuickAction icon={ShieldCheck} label={`Review KYC (${stats.pendingKyc || 0})`} onClick={() => navigate('/users')} color={stats.pendingKyc > 0 ? 'amber' : 'blue'} />
              <QuickAction icon={Building2} label={`Business KYB (${stats.pendingBusinessKyb || 0})`} onClick={() => navigate('/business-kyb')} color={stats.pendingBusinessKyb > 0 ? 'amber' : 'blue'} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pool Health + Oracle + Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--az-text-secondary)' }}>Pool Health</h2>
          {healthError && <ErrorState message="Failed to load system health." onRetry={refetchHealth} compact />}
          <PoolBar label="Master Crypto (USDC)" balance={pools.masterCrypto?.balance || 0} currency="USDC" max={100000} />
          <PoolBar label="Hot Wallet (USDC)" balance={pools.hotWallet?.balance || 0} currency="USDC" max={20000} />
          <PoolBar label="Fiat Pool (MTN Momo — GHS)" balance={pools.fiatPool?.balance || 0} currency="GHS" max={500000} status={pools.fiatPool?.status} />
          <PoolBar label="Profit & Fees" balance={pools.profitFees?.balance || 0} currency="USD" max={50000} />
        </div>

        <div className="space-y-4">
          {/* Oracle */}
          <div className="az-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--az-text-secondary)' }}>Oracle Rates</h2>
              <span className="az-chip" style={{
                background: oracle.source === 'LIVE' ? 'var(--az-emerald-soft)' : 'var(--az-amber-soft)',
                color: oracle.source === 'LIVE' ? 'var(--az-emerald)' : 'var(--az-amber)',
              }}>
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
                  <span className="text-xs" style={{ color: 'var(--az-text-muted)' }}>{label}</span>
                  <span className="text-sm font-bold az-mono" style={{ color: 'var(--az-emerald)' }}>{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--az-text-muted)' }}>
              Last sync: {oracle.lastSync ? new Date(oracle.lastSync).toLocaleTimeString() : '–'}
            </p>
          </div>

          {/* Engine */}
          <div className="az-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--az-text-secondary)' }}>Engine Status</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full az-pulse" style={{ background: engine.online ? 'var(--az-emerald)' : 'var(--az-red)' }} />
                <span className="text-xs" style={{ color: engine.online ? 'var(--az-emerald)' : 'var(--az-red)' }}>
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
                  <Icon className="w-3.5 h-3.5" style={{ color: 'var(--az-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--az-text-muted)' }}>{label}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--az-text-secondary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Escrow & Business */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--az-text-secondary)' }}>Escrow & Business</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Active Escrows" value={stats.activeEscrows || 0} icon={Lock} color="blue" />
          <StatCard label="Disputed Escrows" value={stats.disputedEscrows || 0} icon={ShieldAlert} color="red" onClick={() => navigate('/escrow-disputes')} />
          <StatCard label="Pending Business KYB" value={stats.pendingBusinessKyb || 0} icon={Building2} color="amber" onClick={() => navigate('/business-kyb')} />
        </div>
      </div>
    </div>
  );
}
