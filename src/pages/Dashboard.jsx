import { useStats, useSystemHealth } from '@/lib/useAdminData';
import StatCard from '@/components/admin/StatCard';
import PoolBar from '@/components/admin/PoolBar';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, Activity, AlertTriangle, Wallet,
  ShieldCheck, Clock, Server, Cpu, Radio,
  Lock, ShieldAlert, Building2
} from 'lucide-react';

function fmt(n, prefix = '') {
  if (n >= 1000000) return `${prefix}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${n}`;
}

export default function Dashboard() {
  const { data: stats = {}, isLoading: loadingStats } = useStats();
  const { data: health = {}, isLoading: loadingHealth } = useSystemHealth();
  const navigate = useNavigate();
  const rate = stats.ghsRate || 12.5;

  const pools = health.pools || {};
  const oracle = health.oracle || {};
  const engine = health.engine || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Command Center</h1>
        <p className="text-sm text-az-text-secondary mt-1">Real-time platform overview</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Profit (30d)"
          value={`$${fmt(stats.totalProfit || 0)}`}
          sub={`₵${fmt((stats.totalProfit || 0) * rate)}`}
          icon={TrendingUp} color="emerald"
          onClick={() => navigate('/profits')}
        />
        <StatCard
          label="Total Users"
          value={fmt(stats.totalUsers || 0)}
          sub={`${stats.activeVendors || 0} active vendors`}
          icon={Users} color="blue"
          onClick={() => navigate('/users')}
        />
        <StatCard
          label="24h Volume"
          value={`$${fmt(stats.fiatVolume24h || 0)}`}
          sub={`₵${fmt((stats.fiatVolume24h || 0) * rate)}`}
          icon={Activity} color="purple"
        />
        <StatCard
          label="Live Trades"
          value={stats.liveTrades || 0}
          sub={`${stats.disputes || 0} disputed`}
          icon={Radio} color="amber"
          onClick={() => navigate('/war-room')}
        />
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending KYC" value={stats.pendingKYC || 0} icon={ShieldCheck} color="amber" onClick={() => navigate('/users')} />
        <StatCard label="Pending Withdrawals" value={stats.pendingWithdrawals || 0} icon={Wallet} color="red" onClick={() => navigate('/withdrawals')} />
        <StatCard label="Active Disputes" value={stats.disputes || 0} icon={AlertTriangle} color="red" onClick={() => navigate('/war-room')} />
        <StatCard label="Crypto Volume 24h" value={`$${fmt(stats.cryptoVolume24h || 0)}`} sub={`₵${fmt((stats.cryptoVolume24h || 0) * rate)}`} icon={Activity} color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Pools */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-az-text-secondary uppercase tracking-wide">Pool Health</h2>
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