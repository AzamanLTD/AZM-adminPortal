import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Users, ShieldAlert, Wallet, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getExecutiveSummary } from '@/lib/controlPlaneExecutiveApi';
import { Button } from '@/components/forge';

function Stat({ label, value, icon: Icon, tone = 'normal' }) {
  const tones = {
    normal: 'var(--f-text)',
    good: 'var(--f-ok)',
    warn: 'var(--f-warn)',
    bad: 'var(--f-bad)',
    info: 'var(--f-info)',
  };
  return (
    <div className="az-stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="az-section-label">{label}</p>
        <Icon className="h-4 w-4" style={{ color: tones[tone] }} />
      </div>
      <p className="az-kpi-value text-[28px]" style={{ color: tones[tone] }}>{value ?? '—'}</p>
    </div>
  );
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `${num(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
}

export default function ExecutiveControlPlane() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['control-plane', 'executive-summary'],
    queryFn: getExecutiveSummary,
    refetchInterval: 30_000,
  });

  const data = query.data?.executiveSummary || {};
  const workforce = data.workforce || {};
  const disputes = data.disputes || {};
  const treasury = data.treasury || {};
  const exceptions = data.financialExceptions || {};
  const profit = data.profit || {};
  const byStatus = disputes.byStatus || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="az-section-label">Executive</p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--f-text)' }}>Command Center</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>
            Read-only executive posture across workforce, disputes, treasury, exceptions, and platform profit.
          </p>
        </div>
        <Button variant="ghost" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {query.isError && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--f-bad-bg)', color: 'var(--f-bad)', border: '1px solid var(--f-line)' }}>
          Unable to load the executive snapshot. Your account may not have the required staff.view permission.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Active Staff" value={workforce.activeStaff} icon={Users} tone="info" />
        <Stat label="Online" value={workforce.onlineStaff} icon={Users} tone="good" />
        <Stat label="Open Disputes" value={disputes.open} icon={ShieldAlert} tone={num(disputes.open) ? 'warn' : 'good'} />
        <Stat label="Treasury" value={money(treasury.balance)} icon={Wallet} tone="normal" />
        <Stat label="Exceptions" value={exceptions.exceptionCount} icon={AlertTriangle} tone={num(exceptions.exceptionCount) ? 'bad' : 'good'} />
        <Stat label="Profit · 24h" value={money(profit.last24h)} icon={TrendingUp} tone="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="rounded-xl p-5 lg:col-span-2" style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="az-section-label">Risk & exceptions</p>
              <p className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>Operational items requiring investigation</p>
            </div>
            <button className="text-xs flex items-center gap-1" style={{ color: 'var(--f-info)' }} onClick={() => navigate('/escrow-disputes')}>
              Open disputes <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Pending transactions', exceptions.pendingCount],
              ['Failed transactions', exceptions.failedCount],
              ['Frozen disputes', exceptions.frozenDisputeCount],
              ['Resolved disputes', byStatus.RESOLVED || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg p-4" style={{ background: 'var(--f-surface-sunken)' }}>
                <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>{label}</p>
                <p className="text-xl font-bold mt-1">{value ?? 0}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl p-5" style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
          <p className="az-section-label">Platform profit</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Last 24 hours</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--f-ok)' }}>{money(profit.last24h)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Last 7 days</p>
              <p className="text-xl font-bold mt-1">{money(profit.last7d)}</p>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'var(--f-line)' }}>
              <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Treasury last updated</p>
              <p className="text-xs mt-1" style={{ color: 'var(--f-text-2)' }}>{treasury.updatedAt ? new Date(treasury.updatedAt).toLocaleString() : '—'}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'var(--f-surface-sunken)', border: '1px solid var(--f-line)' }}>
        <div>
          <p className="text-sm font-semibold">Read-only governance surface</p>
          <p className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>This view does not perform financial mutations or alter operational state.</p>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--f-ok)' }}>MUTATIONS DISABLED</span>
      </div>
    </div>
  );
}
