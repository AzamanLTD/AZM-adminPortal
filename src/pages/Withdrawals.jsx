/**
 * Withdrawals — Enhanced approval queue with risk scoring & batch operations
 *
 * Features:
 * - Risk score per withdrawal (KYC, ban status, strike count, amount, trade history)
 * - Batch select + approve-all for low-risk withdrawals
 * - Detail drawer with full user context (KYC, strikes, trade history)
 * - Summary stats bar (total pending, total value, by type)
 * - Filter by type (ALL/FIAT/CRYPTO) and risk level
 * - Sort by risk (highest first) by default
 *
 * Reference: Stripe payout review, Coinbase withdrawal review, Wise compliance queue
 */
import { useState, useMemo } from 'react';
import { useWithdrawals, useStats } from '@/lib/useAdminData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, XCircle, RefreshCw, Wallet, AlertTriangle,
  ShieldCheck, ShieldAlert, ChevronRight, X,
  TrendingUp, User, CheckSquare, Square
} from 'lucide-react';
import { toast } from 'sonner';
import ActionDialog from '@/components/ActionDialog';

const TYPE_COLORS = {
  FIAT: 'bg-[var(--f-info-bg)] text-[var(--f-info)]',
  CRYPTO: 'bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)]',
};

/* ── Risk scoring engine ───────────────────────────────────────────────── */
function computeRiskScore(w) {
  let score = 0;
  const factors = [];

  // KYC status
  const kyc = w.user?.kycStatus || 'UNVERIFIED';
  if (kyc !== 'VERIFIED') {
    score += 30;
    factors.push({ label: 'KYC not verified', weight: 30, level: 'high' });
  }

  // Ban status
  if (w.user?.banStatus === 'BANNED') {
    score += 50;
    factors.push({ label: 'User is banned', weight: 50, level: 'critical' });
  }

  // Strike count
  const strikes = w.user?.strikeCount || 0;
  if (strikes >= 3) {
    score += 25;
    factors.push({ label: `${strikes} strikes on record`, weight: 25, level: 'high' });
  } else if (strikes >= 1) {
    score += 10;
    factors.push({ label: `${strikes} strike${strikes > 1 ? 's' : ''}`, weight: 10, level: 'medium' });
  }

  // Amount-based risk (>$1000 is higher risk)
  const amount = Number(w.amount) || 0;
  if (amount >= 5000) {
    score += 20;
    factors.push({ label: 'Large withdrawal ($5K+)', weight: 20, level: 'high' });
  } else if (amount >= 1000) {
    score += 10;
    factors.push({ label: 'Medium withdrawal ($1K+)', weight: 10, level: 'medium' });
  }

  // Trade history (fewer trades = less established = higher risk)
  const trades = w.user?.tradesCompleted || 0;
  if (trades < 5) {
    score += 15;
    factors.push({ label: 'Low trade history (<5 completed)', weight: 15, level: 'medium' });
  }

  // Time waiting (longer = more pressure to process)
  const waitHours = w.requestedAt
    ? (Date.now() - new Date(w.requestedAt).getTime()) / 36e5
    : 0;
  if (waitHours > 24) {
    score -= 5; // reduce risk slightly — they've been waiting, likely legitimate
    factors.push({ label: `Waiting ${Math.floor(waitHours)}h (SLA pressure)`, weight: -5, level: 'info' });
  }

  score = Math.max(0, Math.min(100, score));

  const level = score >= 40 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';

  return { score, level, factors };
}

const RISK_STYLES = {
  HIGH: { badge: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)] border-[var(--f-bad)]', icon: ShieldAlert, label: 'High Risk' },
  MEDIUM: { badge: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)] border-amber-500/30', icon: AlertTriangle, label: 'Medium Risk' },
  LOW: { badge: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)] border-[var(--f-ok)]', icon: ShieldCheck, label: 'Low Risk' },
};

/* ── Detail drawer ──────────────────────────────────────────────────────── */
function WithdrawalDetailDrawer({ withdrawal, risk, rate, onClose, onApprove, onReject, approvePending, rejectPending }) {
  if (!withdrawal) return null;
  const u = withdrawal.user || {};
  const RiskIcon = risk.level === 'HIGH' ? ShieldAlert : risk.level === 'MEDIUM' ? AlertTriangle : ShieldCheck;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md h-full bg-[var(--f-surface-raised)] border-l border-line overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--f-surface-raised)] border-b border-line px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${RISK_STYLES[risk.level].badge}`}>
              <RiskIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--f-text)]">Withdrawal Review</h2>
              <p className="text-xs text-ink-3">Risk score: {risk.score}/100 · {RISK_STYLES[risk.level].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--f-surface-sunken)] text-ink-3">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Amount */}
          <div className="bg-[var(--f-surface-sunken)] border border-line rounded-xl p-4">
            <p className="text-xs text-ink-3 uppercase tracking-wide mb-1">Amount</p>
            <p className="text-2xl font-bold text-[var(--f-ok)]">
              ${Number(withdrawal.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} {withdrawal.currency}
            </p>
            {withdrawal.type === 'FIAT' && (
              <p className="text-sm text-ink-2 mt-1">≈ ₵{(Number(withdrawal.amount) * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            )}
          </div>

          {/* User info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wide">User</h3>
            <div className="bg-[var(--f-surface-sunken)] border border-line rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Username</span>
                <span className="text-sm font-medium text-[var(--f-text)]">{u.username || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Email</span>
                <span className="text-sm font-medium text-[var(--f-text)] truncate ml-2">{u.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">KYC Status</span>
                <Tag className={`border-0 text-xs ${u.kycStatus === 'VERIFIED' ? 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]' : 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]'}`}>
                  {u.kycStatus || 'UNVERIFIED'}
                </Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Ban Status</span>
                <Tag className={`border-0 text-xs ${u.banStatus === 'ACTIVE' ? 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]' : 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]'}`}>
                  {u.banStatus || 'ACTIVE'}
                </Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Strikes</span>
                <span className={`text-sm font-medium ${u.strikeCount >= 3 ? 'text-[var(--f-bad)]' : u.strikeCount >= 1 ? 'text-[var(--f-warn)]' : 'text-[var(--f-ok)]'}`}>
                  {u.strikeCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Completed Trades</span>
                <span className="text-sm font-medium text-[var(--f-text)]">{u.tradesCompleted || 0}</span>
              </div>
            </div>
          </div>

          {/* Risk factors */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Risk Factors</h3>
            <div className="space-y-2">
              {risk.factors.length === 0 && (
                <div className="text-sm text-[var(--f-ok)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> No risk factors detected
                </div>
              )}
              {risk.factors.map((f, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                  f.level === 'critical' ? 'bg-[var(--f-bad)]/5 border-[var(--f-bad)]' :
                  f.level === 'high' ? 'bg-[var(--f-bad)]/5 border-red-500/15' :
                  f.level === 'medium' ? 'bg-[var(--f-warn)]/5 border-amber-500/15' :
                  'bg-[var(--f-info)]/5 border-blue-500/15'
                }`}>
                  <span className={`text-sm ${
                    f.level === 'critical' || f.level === 'high' ? 'text-[var(--f-bad)]' :
                    f.level === 'medium' ? 'text-[var(--f-warn)]' : 'text-[var(--f-info)]'
                  }`}>{f.label}</span>
                  <span className="text-xs font-mono text-ink-3">{f.weight > 0 ? '+' : ''}{f.weight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Payment Details</h3>
            <div className="bg-[var(--f-surface-sunken)] border border-line rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Type</span>
                <Tag className={`border-0 text-xs ${TYPE_COLORS[withdrawal.type] || 'bg-surface-sunken text-ink-2'}`}>
                  {withdrawal.type}
                </Tag>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Method</span>
                <span className="text-sm font-medium text-[var(--f-text)]">{withdrawal.method || withdrawal.wallet || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Requested</span>
                <span className="text-sm text-ink-2">
                  {withdrawal.requestedAt ? new Date(withdrawal.requestedAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]"
              disabled={approvePending}
              onClick={() => onApprove(withdrawal.id)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {approvePending ? 'Processing…' : 'Approve'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 text-[var(--f-bad)] hover:bg-[var(--f-bad-bg)]"
              disabled={rejectPending}
              onClick={() => onReject(withdrawal)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function Withdrawals() {
  const { data: rawWithdrawals = [], isLoading, refetch } = useWithdrawals();
  const { data: stats = {} } = useStats();
  const rate = stats.ghsRate || 12.5;
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [filterType, setFilterType] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  const approve = useMutation({
    mutationFn: (id) => api.withdrawals.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
      toast.success('Withdrawal approved');
      setDetailTarget(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to approve withdrawal'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }) => api.withdrawals.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
      toast.success('Withdrawal rejected');
      setRejectTarget(null);
      setDetailTarget(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to reject withdrawal'),
  });

  // Compute risk scores for all withdrawals
  const withdrawals = useMemo(() => {
    return rawWithdrawals.map(w => ({
      ...w,
      risk: computeRiskScore(w),
    }));
  }, [rawWithdrawals]);

  // Filter + sort (highest risk first)
  const filtered = useMemo(() => {
    let result = withdrawals;
    if (filterType !== 'ALL') result = result.filter(w => w.type === filterType);
    if (filterRisk !== 'ALL') result = result.filter(w => w.risk.level === filterRisk);
    return result.sort((a, b) => b.risk.score - a.risk.score);
  }, [withdrawals, filterType, filterRisk]);

  // Summary stats
  const summary = useMemo(() => {
    const total = filtered.length;
    const totalValue = filtered.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const highRisk = filtered.filter(w => w.risk.level === 'HIGH').length;
    const fiatCount = filtered.filter(w => w.type === 'FIAT').length;
    const cryptoCount = filtered.filter(w => w.type === 'CRYPTO').length;
    return { total, totalValue, highRisk, fiatCount, cryptoCount };
  }, [filtered]);

  // Batch selection
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLowRisk = () => {
    const lowRiskIds = filtered.filter(w => w.risk.level === 'LOW').map(w => w.id);
    setSelected(new Set(lowRiskIds));
  };

  const clearSelection = () => setSelected(new Set());

  // Batch approve (sequential to avoid overwhelming the API)
  const batchApprove = useMutation({
    mutationFn: async (ids) => {
      const results = [];
      for (const id of ids) {
        try {
          await api.withdrawals.approve(id);
          results.push({ id, ok: true });
        } catch (e) {
          results.push({ id, ok: false, error: e.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const succeeded = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok).length;
      qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
      if (failed === 0) {
        toast.success(`Batch approved ${succeeded} withdrawals`);
      } else {
        toast.warning(`Approved ${succeeded}, ${failed} failed`);
      }
      clearSelection();
      setShowBatchConfirm(false);
    },
    onError: (e) => toast.error(e.message || 'Batch approval failed'),
  });

  const selectedArray = Array.from(selected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--f-text)]">Pending Withdrawals</h1>
          <p className="text-sm text-ink-2 mt-1">
            {summary.total} pending · ${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} total value
            {summary.highRisk > 0 && <span className="text-[var(--f-bad)] ml-2">· {summary.highRisk} high-risk</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-line text-ink-2 hover:bg-[var(--f-surface-sunken)]">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-3.5 h-3.5 text-[var(--f-info)]" />
            <span className="text-xs text-ink-3 uppercase">Total Pending</span>
          </div>
          <p className="text-xl font-bold text-[var(--f-text)]">{summary.total}</p>
        </div>
        <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--f-ok)]" />
            <span className="text-xs text-ink-3 uppercase">Total Value</span>
          </div>
          <p className="text-xl font-bold text-[var(--f-ok)]">${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--f-bad)]" />
            <span className="text-xs text-ink-3 uppercase">High Risk</span>
          </div>
          <p className={`text-xl font-bold ${summary.highRisk > 0 ? 'text-[var(--f-bad)]' : 'text-[var(--f-ok)]'}`}>{summary.highRisk}</p>
        </div>
        <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3.5 h-3.5 text-[var(--f-tint-color)]" />
            <span className="text-xs text-ink-3 uppercase">FIAT / Crypto</span>
          </div>
          <p className="text-xl font-bold text-[var(--f-text)]">{summary.fiatCount} <span className="text-ink-3 text-sm">/</span> {summary.cryptoCount}</p>
        </div>
      </div>

      {/* Filters + batch bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {/* Type filter */}
          <div className="flex items-center gap-1 bg-[var(--f-surface-raised)] border border-line rounded-lg p-0.5">
            {['ALL', 'FIAT', 'CRYPTO'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === type ? 'bg-[var(--f-surface-sunken)] text-[var(--f-text)]' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {/* Risk filter */}
          <div className="flex items-center gap-1 bg-[var(--f-surface-raised)] border border-line rounded-lg p-0.5">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(risk => (
              <button
                key={risk}
                onClick={() => setFilterRisk(risk)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterRisk === risk
                    ? risk === 'HIGH' ? 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]'
                      : risk === 'MEDIUM' ? 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]'
                      : risk === 'LOW' ? 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]'
                      : 'bg-[var(--f-surface-sunken)] text-[var(--f-text)]'
                    : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>
        </div>

        {/* Batch actions */}
        {selectedArray.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-2">{selectedArray.length} selected</span>
            <button onClick={clearSelection} className="text-xs text-ink-3 hover:text-ink-2">Clear</button>
            <Button
              size="sm"
              onClick={() => setShowBatchConfirm(true)}
              className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)] h-8"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
              Batch Approve ({selectedArray.length})
            </Button>
          </div>
        ) : (
          <button
            onClick={selectAllLowRisk}
            className="text-xs text-ink-3 hover:text-[var(--f-ok)] transition-colors"
          >
            Select all low-risk
          </button>
        )}
      </div>

      {/* Withdrawal list */}
      <div className="space-y-2">
        {isLoading && <p className="text-ink-3 text-sm">Loading…</p>}
        {filtered.map((w) => {
          const riskStyle = RISK_STYLES[w.risk.level];
          const RiskIcon = riskStyle.icon;
          const isSelected = selected.has(w.id);

          return (
            <div
              key={w.id}
              className={`bg-[var(--f-surface-raised)] border rounded-xl p-4 flex items-center gap-3 transition-colors ${
                isSelected ? 'border-emerald-500/40 bg-[var(--f-ok)]/5' : 'border-line'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleSelect(w.id)}
                className="shrink-0 p-1"
                title={isSelected ? 'Deselect' : 'Select for batch'}
              >
                {isSelected
                  ? <CheckSquare className="w-4 h-4 text-[var(--f-ok)]" />
                  : <Square className="w-4 h-4 text-ink-3 hover:text-ink-2" />
                }
              </button>

              {/* Risk badge */}
              <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border ${riskStyle.badge}`}>
                <RiskIcon className="w-4 h-4" />
              </div>

              {/* Main info */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setDetailTarget(w)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--f-text)]">{w.userName || w.user?.username || 'Unknown'}</span>
                  <Tag className={`border-0 text-xs ${TYPE_COLORS[w.type] || 'bg-surface-sunken text-ink-2'}`}>{w.type}</Tag>
                  <span className="text-sm font-bold text-[var(--f-ok)]">
                    ${Number(w.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} {w.currency}
                  </span>
                  {w.type === 'FIAT' && (
                    <span className="text-xs text-ink-3">
                      ₵{(Number(w.amount) * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${riskStyle.badge} font-medium`}>
                    {w.risk.score}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-ink-3">
                  <span>{w.method || w.wallet || '—'}</span>
                  <span>{w.requestedAt ? new Date(w.requestedAt).toLocaleString() : ''}</span>
                  {w.user?.kycStatus !== 'VERIFIED' && (
                    <span className="text-[var(--f-warn)]">KYC: {w.user?.kycStatus || 'UNVERIFIED'}</span>
                  )}
                  {w.user?.strikeCount > 0 && (
                    <span className="text-[var(--f-bad)]">{w.user.strikeCount} strike{w.user.strikeCount > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setDetailTarget(w)}
                  className="p-2 rounded-lg hover:bg-[var(--f-surface-sunken)] text-ink-3 hover:text-[var(--f-text)] transition-colors"
                  title="View details"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <Button
                  size="sm"
                  onClick={() => approve.mutate(w.id)}
                  disabled={approve.isPending}
                  className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)] h-8"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectTarget(w)}
                  className="border-red-500/50 text-[var(--f-bad)] hover:bg-[var(--f-bad-bg)] h-8"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                </Button>
              </div>
            </div>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-ink-3 text-sm bg-[var(--f-surface-raised)] border border-line rounded-xl">
            {withdrawals.length === 0 ? 'No pending withdrawals — all clear' : 'No withdrawals match the current filters'}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <ActionDialog
        open={!!rejectTarget}
        title="Reject Withdrawal"
        label="Reason for rejection"
        placeholder="Enter rejection reason…"
        confirmLabel="Reject"
        variant="destructive"
        isPending={reject.isPending}
        inputType="textarea"
        onConfirm={(reason) => reject.mutate({ id: rejectTarget.id, reason })}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Batch confirm dialog */}
      {showBatchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBatchConfirm(false)} />
          <div className="relative bg-[var(--f-surface-raised)] border border-line rounded-xl w-full max-w-md mx-4 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--f-ok-bg)] border border-[var(--f-ok)] flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-4 h-4 text-[var(--f-ok)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--f-text)]">Batch Approve {selectedArray.length} Withdrawals</h2>
                <p className="text-sm text-ink-3 mt-1">
                  This will approve all selected withdrawals sequentially. Each will be processed by the payout worker.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 border border-line text-ink-2 hover:text-[var(--f-text)] hover:bg-[var(--f-surface-sunken)]"
                onClick={() => setShowBatchConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]"
                disabled={batchApprove.isPending}
                onClick={() => batchApprove.mutate(selectedArray)}
              >
                {batchApprove.isPending ? `Processing… (${selectedArray.length})` : `Approve All (${selectedArray.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detailTarget && (
        <WithdrawalDetailDrawer
          withdrawal={detailTarget}
          risk={detailTarget.risk}
          rate={rate}
          onClose={() => setDetailTarget(null)}
          onApprove={(id) => approve.mutate(id)}
          onReject={(w) => setRejectTarget(w)}
          approvePending={approve.isPending}
          rejectPending={reject.isPending}
        />
      )}
    </div>
  );
}
