/**
 * Admin Command Center — Premium Dark Dashboard
 * Design reference: Spark Pixel Team Dashboard (dark bg, orange accent, dense data)
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  useStats, useSystemHealth, useProfitBreakdown, useWithdrawals, useDisputes, usePendingKyc, useEscrowDisputes
} from '@/lib/useAdminData';
import { Button } from '@/components/forge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Users, Activity, AlertTriangle, Wallet, ShieldCheck, Lock, Building2, CheckCircle, ArrowRight, RefreshCw,
  TrendingDown, Zap, Radio, Shield, FileCheck, ArrowUpRight,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
function fmtUSD(n) {
  if (n == null) return '$0';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function useTokenVar(name, fallback) {
  const [val, setVal] = useState(fallback);
  useEffect(() => {
    const update = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) setVal(v);
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [name]);
  return val;
}

// ── Time range ────────────────────────────────────────────────────────────────
const TIME_RANGES = ['24h','7d','30d','90d'];

// ── Chart tooltip ─────────────────────────────────────────────────────────────
/** @param {{ active?: boolean, payload?: Array<{ color?: string, fill?: string, name?: string, value?: number | string }>, label?: string }} props */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-2xl"
      style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line-strong)' }}>
      <p className="font-medium mb-1" style={{ color: 'var(--f-text-3)' }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: e.color || e.fill }} />
          <span style={{ color: 'var(--f-text-2)' }}>{e.name}:</span>
          <span className="font-bold font-mono" style={{ color: 'var(--f-text)' }}>{fmtUSD(e.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── KPI Tile — the orange accent stat card ─────────────────────────────────
/** @param {{ label: string, value: string | number, sub?: string, icon?: any, accent?: boolean, trend?: 'up' | 'down', loading?: boolean, onClick?: () => void }} props */
function KpiTile({ label, value, sub, icon: Icon, accent = false, trend, loading = false, onClick }) {
  if (loading) return (
    <div className="az-stat-card space-y-3">
      <div className="h-3 w-20 rounded bg-[var(--f-surface-sunken)] animate-pulse" />
      <div className="h-7 w-24 rounded bg-[var(--f-surface-sunken)] animate-pulse" />
      <div className="h-3 w-16 rounded bg-[var(--f-surface-sunken)] animate-pulse" />
    </div>
  );
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.12 }}
      onClick={onClick} className={`az-stat-card ${onClick ? 'cursor-pointer' : ''}`}
      style={accent ? { borderTop: '2px solid var(--az-orange)' } : { borderTop: '2px solid transparent' }}>
      <div className="flex items-start justify-between mb-3">
        <p className="az-section-label">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: accent ? 'var(--az-orange-bg)' : 'var(--f-surface-sunken)' }}>
            <Icon style={{ width: 14, height: 14, color: accent ? 'var(--az-orange)' : 'var(--f-text-3)' }} />
          </div>
        )}
      </div>
      <p className="az-kpi-value text-[28px]">{value ?? '—'}</p>
      {sub && (
        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--f-text-3)' }}>
          {trend === 'up' && <TrendingUp className="h-3 w-3" style={{ color: 'var(--f-ok)' }} />}
          {trend === 'down' && <TrendingDown className="h-3 w-3" style={{ color: 'var(--f-bad)' }} />}
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ── Alert row ────────────────────────────────────────────────────────────────
function AlertRow({ icon: Icon, label, count, severity = 'warn', to }) {
  const navigate = useNavigate();
  const colors = {
    bad:  { bg: 'var(--f-bad-bg)',  text: 'var(--f-bad)',  border: 'rgba(165,40,38,.2)' },
    warn: { bg: 'var(--f-warn-bg)', text: 'var(--f-warn)', border: 'rgba(138,90,6,.2)'  },
    ok:   { bg: 'var(--f-ok-bg)',   text: 'var(--f-ok)',   border: 'rgba(31,122,77,.2)' },
  }[severity];
  if (!count) return null;
  return (
    <motion.div initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }}
      onClick={() => navigate(to)}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
      <div className="flex items-center gap-2.5">
        <Icon style={{ width: 14, height: 14, color: colors.text }} />
        <span className="text-sm" style={{ color: colors.text }}>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold font-mono" style={{ color: colors.text }}>{count}</span>
        <ArrowRight style={{ width: 12, height: 12, color: colors.text }} />
      </div>
    </motion.div>
  );
}

// ── System health dot ─────────────────────────────────────────────────────────
function HealthDot({ ok }) {
  return (
    <span className="relative flex h-2 w-2">
      {ok && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: 'var(--f-ok)' }} />}
      <span className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: ok ? 'var(--f-ok)' : 'var(--f-bad)' }} />
    </span>
  );
}

// ── Pill time range ───────────────────────────────────────────────────────────
function PillTabs({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--f-surface-sunken)' }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`az-pill-tab px-3 py-1 text-xs font-semibold rounded-md transition-all ${value===o ? 'active' : ''}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState('30d');

  const { data: stats, isLoading: statsLoading, refetch } = useStats();
  const { data: health } = useSystemHealth();
  const { data: profit } = useProfitBreakdown();
  const { data: withdrawals } = useWithdrawals();
  const { data: disputes } = useDisputes();
  const { data: kyc } = usePendingKyc();
  const { data: escrow } = useEscrowDisputes();

  const orange = useTokenVar('--az-orange', '#f97316');
  const orangeBg = useTokenVar('--az-orange-bg', 'rgba(249,115,22,0.10)');
  const textColor = useTokenVar('--f-text-3', '#8b8983');
  const lineColor = useTokenVar('--f-line', '#26262a');

  // Build chart data from profit breakdown
  const chartData = useMemo(() => {
    if (!profit?.dailyRevenue?.length) {
      // Generate placeholder skeleton data
      return Array.from({ length: 12 }, (_, i) => ({
        label: `Month ${i+1}`,
        newUser: Math.floor(Math.random() * 30000 + 5000),
        existing: Math.floor(Math.random() * 18000 + 3000),
      }));
    }
    return profit.dailyRevenue.map(d => ({
      label: d.label || d.date,
      newUser: d.newRevenue || d.revenue || 0,
      existing: d.existingRevenue || 0,
    }));
  }, [profit]);

  // Dispute data
  const disputeList = disputes?.disputes || disputes?.data || [];
  const pendingKycCount = kyc?.pending?.length || kyc?.count || 0;
  const escrowCount = escrow?.disputes?.length || escrow?.count || 0;
  const withdrawalCount = withdrawals?.pending?.length || withdrawals?.count || 0;

  const totalRevenue = stats?.totalRevenue || stats?.totalVolume || 0;
  const totalUsers = stats?.totalUsers || 0;
  const totalBusinesses = stats?.totalBusinesses || 0;
  const activeDisputes = stats?.activeDisputes || 0;

  const isSystemHealthy = health?.status === 'ok' || health?.healthy;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)' }}>
            Welcome back, Admin
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--f-text-3)' }}>
            {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
            <HealthDot ok={isSystemHealthy} />
            <span style={{ color: 'var(--f-text-3)' }}>
              {isSystemHealthy ? 'All systems operational' : 'System issues detected'}
            </span>
          </div>
          <PillTabs value={range} onChange={setRange} options={TIME_RANGES} />
          <button onClick={() => refetch()} className="f-icon-btn">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile label="Total Revenue" value={fmtUSD(totalRevenue)} icon={TrendingUp}
          sub="+0.94% last year" trend="up" accent loading={statsLoading} />
        <KpiTile label="Total Users" value={fmt(totalUsers)} icon={Users}
          sub="+0.12% last year" trend="up" loading={statsLoading}
          onClick={() => navigate('/users')} />
        <KpiTile label="Businesses" value={fmt(totalBusinesses)} icon={Building2}
          sub="across all categories" loading={statsLoading}
          onClick={() => navigate('/businesses')} />
        <KpiTile label="Active Disputes" value={fmt(activeDisputes)} icon={AlertTriangle}
          sub={activeDisputes > 0 ? 'requires attention' : 'all clear'} 
          trend={activeDisputes > 0 ? 'down' : undefined} loading={statsLoading}
          onClick={() => navigate('/war-room')} />
      </div>

      {/* ── Revenue Chart + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="lg:col-span-2 az-chart-container">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="az-section-label">Sales Trend</p>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color: 'var(--f-text)' }}>
                {fmtUSD(totalRevenue)}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--f-text-3)' }}>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: orange }} />
                New User
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--f-line-strong)' }} />
                Existing User
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={lineColor} strokeOpacity={0.5} />
              <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="newUser" name="New User" fill={orange} radius={[3,3,0,0]} maxBarSize={18} />
              <Bar dataKey="existing" name="Existing" fill="var(--f-surface-sunken)" radius={[3,3,0,0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts + Queues */}
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
            <p className="az-section-label">Action Required</p>
            <div className="space-y-2">
              <AlertRow icon={ShieldCheck} label="KYC Pending" count={pendingKycCount} severity="warn" to="/users" />
              <AlertRow icon={FileCheck} label="Business KYB" count={stats?.pendingBusinessKyb || 0} severity="warn" to="/business-kyb" />
              <AlertRow icon={Lock} label="Escrow Disputes" count={escrowCount} severity="bad" to="/escrow-disputes" />
              <AlertRow icon={Wallet} label="Withdrawals" count={withdrawalCount} severity="warn" to="/withdrawals" />
              <AlertRow icon={AlertTriangle} label="Active Disputes" count={activeDisputes} severity="bad" to="/war-room" />
            </div>
            {!pendingKycCount && !escrowCount && !withdrawalCount && !activeDisputes && (
              <div className="flex items-center gap-2 py-2 text-xs" style={{ color: 'var(--f-ok)' }}>
                <CheckCircle className="h-4 w-4" />
                All queues clear
              </div>
            )}
          </div>

          {/* System health */}
          <div className="rounded-xl p-4"
            style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
            <p className="az-section-label mb-3">System Health</p>
            {[
              { label: 'API Server', ok: health?.api !== false },
              { label: 'Database', ok: health?.database !== false },
              { label: 'Workers', ok: health?.workers !== false },
              { label: 'Escrow Engine', ok: health?.escrow !== false },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: 'var(--f-line)' }}>
                <span className="text-xs" style={{ color: 'var(--f-text-2)' }}>{label}</span>
                <div className="flex items-center gap-1.5">
                  <HealthDot ok={ok} />
                  <span className="text-xs font-medium" style={{ color: ok ? 'var(--f-ok)' : 'var(--f-bad)' }}>
                    {ok ? 'Operational' : 'Down'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Transactions + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Disputes/Transactions */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--f-line)' }}>
            <p className="az-section-label">Recent Disputes</p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/war-room')}
              className="text-xs h-6 px-2 gap-1" style={{ color: 'var(--f-text-3)' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {disputeList.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 opacity-30" style={{ color: 'var(--f-ok)' }} />
              <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>No active disputes</p>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b text-[10px] font-bold uppercase tracking-wider"
                style={{ borderColor: 'var(--f-line)', color: 'var(--f-text-3)' }}>
                <span className="col-span-2">ID</span>
                <span className="col-span-3">Customer</span>
                <span className="col-span-3">Status</span>
                <span className="col-span-2 text-right">Amount</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              {disputeList.slice(0, 6).map((d, i) => (
                <div key={d.id || i}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-0 items-center hover:bg-[var(--f-surface-sunken)] transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--f-line)' }}
                  onClick={() => navigate('/war-room')}>
                  <span className="col-span-2 font-mono text-[10px]" style={{ color: 'var(--f-text-3)' }}>
                    #{(d.id||'').slice(-4)}
                  </span>
                  <span className="col-span-3 text-xs truncate" style={{ color: 'var(--f-text-2)' }}>
                    {d.buyer?.username || d.customerName || '—'}
                  </span>
                  <span className="col-span-3">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                      style={{
                        background: d.status === 'RESOLVED' ? 'var(--f-ok-bg)' : 'var(--f-warn-bg)',
                        color: d.status === 'RESOLVED' ? 'var(--f-ok)' : 'var(--f-warn)',
                      }}>
                      {d.status || 'OPEN'}
                    </span>
                  </span>
                  <span className="col-span-2 text-right text-xs font-mono" style={{ color: 'var(--f-text-2)' }}>
                    {d.amountUsdc ? `${Number(d.amountUsdc).toFixed(2)}` : '—'}
                  </span>
                  <span className="col-span-2 flex justify-end">
                    <ArrowUpRight className="h-3.5 w-3.5" style={{ color: 'var(--f-text-3)' }} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick nav */}
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
          <p className="az-section-label">Quick Navigation</p>
          {[
            { label: 'War Room', desc: 'Live trades & disputes', icon: Zap, to: '/war-room', accent: true },
            { label: 'Businesses', desc: 'All registered merchants', icon: Building2, to: '/businesses' },
            { label: 'Users & KYC', desc: 'Identity verification queue', icon: Users, to: '/users' },
            { label: 'Revenue', desc: 'P&L and profit breakdown', icon: TrendingUp, to: '/profits' },
            { label: 'Fee Engine', desc: 'Rates, splits, profiles', icon: Activity, to: '/fee-engine' },
            { label: 'AI Operations', desc: 'Smart insights & actions', icon: Radio, to: '/ai-ops' },
            { label: 'Audit Log', desc: 'Full action history', icon: Shield, to: '/audit-log' },
          ].map(({ label, desc, icon: Icon, to, accent }) => (
            <button key={to} onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all hover:opacity-80"
              style={{
                background: accent ? 'var(--az-orange-bg)' : 'var(--f-surface-sunken)',
                border: `1px solid ${accent ? 'var(--az-orange-ring)' : 'var(--f-line)'}`,
              }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ background: accent ? 'var(--az-orange-bg)' : 'var(--f-surface-raised)' }}>
                <Icon style={{ width: 14, height: 14, color: accent ? 'var(--az-orange)' : 'var(--f-text-3)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate"
                  style={{ color: accent ? 'var(--az-orange)' : 'var(--f-text)' }}>{label}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--f-text-3)' }}>{desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 ml-auto shrink-0" style={{ color: 'var(--f-text-3)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
