import { getSLA, detectPatterns } from "@/lib/disputes";
import { SlaTimer } from "@/components/forge/SlaTimer";
import { useState, useMemo } from 'react';
import { useDisputes } from '@/lib/useAdminData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/forge';
import { Tag } from '@/components/forge';
import { Input } from '@/components/forge';
import { Textarea } from '@/components/forge';
import {
  Swords, MessageSquare, CheckCircle, XCircle, RefreshCw,
  AlertTriangle, ShieldAlert, Clock, Flame, History,
  FileSearch,
} from 'lucide-react';
import { toast } from 'sonner';

const RULINGS = [
  { value: 'BUYER_WINS',  label: 'Buyer Wins',  color: 'text-[var(--f-ok)]', active: 'border-[var(--f-ok)] bg-[var(--f-ok)10]' },
  { value: 'VENDOR_WINS', label: 'Vendor Wins', color: 'text-[var(--f-info)]', active: 'border-[var(--f-info)] bg-[var(--f-info)10]' },
  { value: 'SPLIT',       label: 'Split Funds', color: 'text-[var(--f-warn)]', active: 'border-[var(--f-warn)] bg-[var(--f-warn)10]' },
];



// ── Extreme Ruling Confirmation Modal ────────────────────────────────────────
function ExtremeRulingModal({ pending, onConfirm, onCancel }) {
  if (!pending) return null;
  const { buyerPercent } = pending;
  const vendorPercent = 100 - buyerPercent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative az-card  w-full max-w-md mx-4 p-6 space-y-5 ">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-warn-bg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--f-warn)]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--f-warn)]">Extreme Ruling</h2>
            <p className="text-xs text-[var(--f-text-2)] mt-0.5">This split is outside the normal 5–95% range</p>
          </div>
        </div>
        <div className="bg-[var(--f-surface)] border border-[var(--f-line-strong)] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--f-text-2)]">Buyer receives</span>
            <span className="font-bold text-[var(--f-text)] f-mono">{buyerPercent}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--f-text-2)]">Vendor receives</span>
            <span className="font-bold text-[var(--f-text)] f-mono">{vendorPercent}%</span>
          </div>
        </div>
        <p className="text-sm text-[var(--f-text-2)] leading-relaxed">
          You are assigning <span className="text-[var(--f-text)] font-semibold">{buyerPercent}%</span> to the buyer and{' '}
          <span className="text-[var(--f-text)] font-semibold">{vendorPercent}%</span> to the vendor.
          This is an unusual split. Are you absolutely certain?
        </p>
        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            className="flex-1 border border-[var(--f-line-strong)] text-[var(--f-text-2)] hover:text-[var(--f-text)] hover:bg-[var(--f-line)]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 border border-[var(--f-bad)] bg-transparent text-[var(--f-bad)] hover:bg-[var(--f-bad)15] font-semibold"
            onClick={onConfirm}
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            Confirm Extreme Ruling
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Reason Input Modal ──────────────────────────────────────────────────────
function ReasonModal({ open, title, placeholder, confirmLabel, onConfirm, onCancel, isPending }) {
  const [reason, setReason] = useState('');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative az-card w-full max-w-md mx-4 p-6 space-y-4 ">
        <h2 className="text-base font-bold text-[var(--f-text)]">{title}</h2>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          className="bg-[var(--f-bg)] border-[var(--f-line-strong)] text-[var(--f-text)] focus:border-[var(--f-info)40] placeholder:text-[var(--f-text-3)] min-h-[80px]"
          autoFocus
        />
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 border border-[var(--f-line-strong)] text-[var(--f-text-2)] hover:text-[var(--f-text)] hover:bg-[var(--f-line)]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold text-sm"
            disabled={!reason.trim() || isPending}
            onClick={() => { onConfirm(reason.trim()); setReason(''); }}
          >
            {isPending ? 'Processing…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Pattern Alert ─────────────────────────────────────────────────────────── */
function PatternAlert({ pattern }) {
  const Icon = pattern.icon;
  const styles = {
    high: 'bg-[var(--f-bad-bg)] border-[var(--f-bad)] text-[var(--f-bad)]',
    medium: 'bg-[var(--f-warn-bg)] border-[var(--f-warn-bg)] text-[var(--f-warn)]',
    warning: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  };
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${styles[pattern.level] || styles.medium}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{pattern.label}</span>
    </div>
  );
}

/* ── Evidence Section ──────────────────────────────────────────────────────── */
function EvidenceSection({ dispute }) {
  const messages = dispute.messages || [];
  // The first message often contains the dispute reason/context
  const evidenceMessages = messages.filter(m =>
    m.sender === 'system' || m.sender === 'admin' || (m.text && m.text.length > 50)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--f-text-2)]">
        <FileSearch className="w-3.5 h-3.5" />
        EVIDENCE & CONTEXT
      </div>
      <div className="bg-[var(--f-bg)] border border-[var(--f-line)] rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
        {evidenceMessages.length === 0 ? (
          <p className="text-xs text-[var(--f-text-3)] italic">No evidence messages in this dispute</p>
        ) : (
          evidenceMessages.slice(0, 5).map((m, i) => (
            <div key={i} className="text-xs">
              <span className={`font-semibold capitalize ${
                m.sender === 'system' ? 'text-[var(--f-text-3)]' :
                m.sender === 'admin' ? 'text-[var(--f-warn)]' :
                m.sender === 'buyer' ? 'text-[var(--f-info)]' : 'text-[var(--f-ok)]'
              }`}>{m.sender}:</span>{' '}
              <span className="text-[var(--f-text-2)]">{m.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Dispute Card ─────────────────────────────────────────────────────────────
function DisputeCard({ dispute, allDisputes }) {
  const [expanded, setExpanded]   = useState(false);
  const [ruling, setRuling]       = useState('BUYER_WINS');
  const [reason, setReason]       = useState('');
  const [buyerPct, setBuyerPct]   = useState(50);
  const [injectMsg, setInjectMsg] = useState('');
  const [tab, setTab]             = useState('resolve');

  const [extremeRulingPending, setExtremeRulingPending] = useState(null);
  const [reasonModal, setReasonModal] = useState(null);

  const qc = useQueryClient();

  // Detect patterns for this dispute
  const patterns = useMemo(
    () => detectPatterns(allDisputes, dispute),
    [allDisputes, dispute]
  );

  const forceRelease = useMutation({
    mutationFn: ({ id, reason }) => api.trades.forceRelease(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'disputes'] });
      const prev = qc.getQueryData(['admin', 'disputes']);
      qc.setQueryData(['admin', 'disputes'], old => {
        if (!Array.isArray(old)) return old;
        return old.map(d => d.id === id ? { ...d, status: 'released', dispute_status: 'resolved' } : d);
      });
      return { prev };
    },
    onSuccess: () => { toast.success('Escrow released to buyer'); qc.invalidateQueries({ queryKey: ['admin', 'disputes'] }); },
    onError: async (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin', 'disputes'], ctx.prev);
      if (e?.statusCode === 409) {
        // A concurrent admin already won the atomic settlement claim.
        // The optimistic projection is stale, so reconcile from the
        // authoritative dispute endpoint instead of treating the request as
        // a successful release.
        await qc.invalidateQueries({ queryKey: ['admin', 'disputes'], refetchType: 'active' });
        toast.error('Trade was already resolved by another admin. The dispute list was refreshed.');
        return;
      }
      toast.error(e.message || 'Force release failed');
    },
  });

  const forceCancel = useMutation({
    mutationFn: ({ id, reason }) => api.trades.forceCancel(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'disputes'] });
      const prev = qc.getQueryData(['admin', 'disputes']);
      qc.setQueryData(['admin', 'disputes'], old => {
        if (!Array.isArray(old)) return old;
        return old.map(d => d.id === id ? { ...d, status: 'cancelled', dispute_status: 'resolved' } : d);
      });
      return { prev };
    },
    onSuccess: () => { toast.success('Trade cancelled, escrow returned to vendor'); qc.invalidateQueries({ queryKey: ['admin', 'disputes'] }); },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin', 'disputes'], ctx.prev);
      toast.error(e.message || 'Force cancel failed');
    },
  });

  const resolve = useMutation({
    mutationFn: ({ id, ruling, reason, buyerPercent, override }) =>
      api.trades.resolve(id, ruling, reason, buyerPercent, override),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'disputes'] });
      const prev = qc.getQueryData(['admin', 'disputes']);
      qc.setQueryData(['admin', 'disputes'], old => {
        if (!Array.isArray(old)) return old;
        return old.map(d => d.id === id ? { ...d, dispute_status: 'resolved' } : d);
      });
      return { prev };
    },
    onSuccess: () => {
      toast.success('Dispute resolved');
      setExtremeRulingPending(null);
      qc.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin', 'disputes'], ctx.prev);
      const data = err?.response?.data || err?.data || {};
      if (data.code === 'EXTREME_RULING_REQUIRES_OVERRIDE') {
        setExtremeRulingPending({ tradeId: dispute.id, ruling, reason, buyerPercent: parseInt(buyerPct) });
        return;
      }
      toast.error(data.message || err.message || 'Failed to resolve dispute');
    },
  });

  const inject = useMutation({
    mutationFn: ({ id, message }) => api.trades.injectMessage(id, message),
    onSuccess: () => { toast.success('Message injected'); setInjectMsg(''); },
    onError: (e) => toast.error(e.message || 'Inject failed'),
  });

  const handleResolve = () => {
    resolve.mutate({ id: dispute.id, ruling, reason, buyerPercent: parseInt(buyerPct) });
  };

  const handleConfirmExtreme = () => {
    if (!extremeRulingPending) return;
    resolve.mutate({
      id: extremeRulingPending.tradeId,
      ruling: extremeRulingPending.ruling,
      reason: extremeRulingPending.reason,
      buyerPercent: extremeRulingPending.buyerPercent,
      override: true,
    });
  };

  const handleReasonConfirm = (reasonText) => {
    if (reasonModal?.type === 'release') {
      forceRelease.mutate({ id: dispute.id, reason: reasonText });
    } else if (reasonModal?.type === 'cancel') {
      forceCancel.mutate({ id: dispute.id, reason: reasonText });
    }
    setReasonModal(null);
  };

  const buyerName = dispute.user?.username || dispute.buyer?.name || 'Unknown';
  const vendorName = dispute.vendor?.username || dispute.vendor?.name || 'Unknown';

  return (
    <>
      <ExtremeRulingModal
        pending={extremeRulingPending}
        onConfirm={handleConfirmExtreme}
        onCancel={() => setExtremeRulingPending(null)}
      />

      <ReasonModal
        open={!!reasonModal}
        title={reasonModal?.type === 'release' ? 'Force Release Escrow' : 'Force Cancel Trade'}
        placeholder={reasonModal?.type === 'release' ? 'Enter reason for force release…' : 'Enter reason for cancellation…'}
        confirmLabel={reasonModal?.type === 'release' ? 'Release Funds' : 'Cancel Trade'}
        onConfirm={handleReasonConfirm}
        onCancel={() => setReasonModal(null)}
        isPending={forceRelease.isPending || forceCancel.isPending}
      />

      <div className="az-card overflow-hidden transition-all duration-200">
        {/* Header row */}
        <div
          className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[var(--f-surface)] transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs f-mono text-[var(--f-text-2)]">#{dispute.id}</span>
              <Tag className="bg-[var(--f-bad)22] text-[var(--f-bad)] border-[var(--f-bad)40] text-xs font-medium">
                DISPUTED
              </Tag>
              <span className="text-sm font-bold text-[var(--f-text)]">
                ${dispute.amount} <span className="text-[var(--f-text-2)] font-normal">{dispute.currency}</span>
              </span>
              <span className="text-xs text-[var(--f-text-3)] bg-[var(--f-line)] px-2 py-0.5 rounded-full">
                {dispute.paymentMethod}
              </span>
              {/* SLA Timer */}
              <SlaTimer createdAt={dispute.createdAt} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-[var(--f-text-3)]">
              <span>Buyer: <span className="text-[var(--f-text-2)]">{buyerName}</span></span>
              <span>Vendor: <span className="text-[var(--f-text-2)]">{vendorName}</span></span>
            </div>
          </div>
          <span className="text-xs text-[var(--f-text-3)] flex-shrink-0 mt-1">
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </span>
        </div>

        {expanded && (
          <div className="border-t border-[var(--f-line)] p-4 space-y-4">
            {/* Pattern alerts */}
            {patterns.length > 0 && (
              <div className="space-y-1.5">
                {patterns.map((p, i) => <PatternAlert key={i} pattern={p} />)}
              </div>
            )}

            {/* Evidence section */}
            <EvidenceSection dispute={dispute} />

            {/* Chat messages */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--f-text-2)]">
                <MessageSquare className="w-3.5 h-3.5" />
                CHAT HISTORY
              </div>
              {(dispute.messages || []).map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'buyer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`rounded-xl px-3 py-2 max-w-xs text-xs ${
                    m.sender === 'buyer'
                      ? 'bg-[var(--f-line)] text-[var(--f-text-2)]'
                      : 'bg-[var(--f-info)22] text-[var(--f-info)]'
                  }`}>
                    <p className="font-semibold mb-0.5 capitalize">{m.sender}</p>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {(!dispute.messages || dispute.messages.length === 0) && (
                <p className="text-xs text-[var(--f-text-3)] text-center py-2">No messages in this dispute</p>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-[var(--f-bg)] rounded-xl p-1 border border-[var(--f-line)]">
              {[['resolve', 'Resolve'], ['inject', 'Inject'], ['quick', 'Quick Actions']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                    tab === t
                      ? 'bg-[var(--f-surface-raised)] text-[var(--f-text)] font-medium shadow-sm'
                      : 'text-[var(--f-text-3)] hover:text-[var(--f-text-2)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Resolve tab */}
            {tab === 'resolve' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {RULINGS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRuling(r.value)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        ruling === r.value
                          ? r.active
                          : 'border-[var(--f-line-strong)] text-[var(--f-text-2)] hover:bg-[var(--f-surface-raised)]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {ruling === 'SPLIT' && (
                  <div>
                    <label className="text-xs text-[var(--f-text-3)] block mb-1">Buyer share: {buyerPct}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={buyerPct}
                      onChange={(e) => setBuyerPct(parseInt(e.target.value))}
                      className="w-full accent-[var(--f-info)]"
                    />
                  </div>
                )}

                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for ruling (required)…"
                  className="bg-[var(--f-bg)] border-[var(--f-line-strong)] text-[var(--f-text)] focus:border-[var(--f-info)40] placeholder:text-[var(--f-text-3)]"
                />

                <Button
                  onClick={handleResolve}
                  disabled={!reason.trim() || resolve.isPending}
                  className="w-full bg-[var(--f-info)] hover:bg-[#3d7ef0] text-[var(--f-text)] font-semibold text-sm"
                >
                  {resolve.isPending ? 'Resolving…' : 'Resolve Dispute'}
                </Button>
              </div>
            )}

            {/* Inject tab */}
            {tab === 'inject' && (
              <div className="space-y-2">
                <Input
                  value={injectMsg}
                  onChange={(e) => setInjectMsg(e.target.value)}
                  placeholder="Admin message to inject into trade chat..."
                  className="bg-[var(--f-bg)] border-[var(--f-line-strong)] text-[var(--f-text)] focus:border-[var(--f-info)40] placeholder:text-[var(--f-text-3)]"
                />
                <Button
                  onClick={() => inject.mutate({ id: dispute.id, message: injectMsg })}
                  disabled={!injectMsg || inject.isPending}
                  className="w-full bg-[var(--f-info)] hover:bg-[#3d7ef0] text-[var(--f-text)] font-semibold text-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-2" />
                  {inject.isPending ? 'Injecting…' : 'Inject Message'}
                </Button>
              </div>
            )}

            {/* Quick Actions tab */}
            {tab === 'quick' && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setReasonModal({ type: 'release' })}
                  variant="outline"
                  className="border-[var(--f-ok)40] text-[var(--f-ok)] hover:bg-[var(--f-ok)10] text-sm"
                  disabled={forceRelease.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-2" />
                  Force Release
                </Button>
                <Button
                  onClick={() => setReasonModal({ type: 'cancel' })}
                  variant="outline"
                  className="border-[var(--f-bad)40] text-[var(--f-bad)] hover:bg-[var(--f-bad)10] text-sm"
                  disabled={forceCancel.isPending}
                >
                  <XCircle className="w-3.5 h-3.5 mr-2" />
                  Force Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Summary Stats Bar ────────────────────────────────────────────────────────
function SummaryBar({ disputes }) {
  const stats = useMemo(() => {
    let escalated = 0;
    let totalHours = 0;
    let totalValue = 0;

    for (const d of disputes) {
      const sla = getSLA(d.createdAt);
      if (sla.level === 'critical') escalated++;
      totalHours += sla.hours;
      totalValue += Number(d.amount) || 0;
    }

    return {
      total: disputes.length,
      escalated,
      avgAge: disputes.length > 0 ? (totalHours / disputes.length).toFixed(1) : 0,
      totalValue,
    };
  }, [disputes]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="az-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <Swords className="w-3.5 h-3.5 text-[var(--f-bad)]" />
          <span className="text-xs text-[var(--f-text-3)] uppercase">Total Disputes</span>
        </div>
        <p className="text-xl font-bold text-[var(--f-text)]">{stats.total}</p>
      </div>
      <div className={`az-card p-3 ${stats.escalated > 0 ? 'border-[var(--f-bad)40]' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-3.5 h-3.5 text-[var(--f-bad)]" />
          <span className="text-xs text-[var(--f-text-3)] uppercase">SLA Breached</span>
        </div>
        <p className={`text-xl font-bold ${stats.escalated > 0 ? 'text-[var(--f-bad)]' : 'text-[var(--f-ok)]'}`}>{stats.escalated}</p>
      </div>
      <div className="az-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-[var(--f-warn)]" />
          <span className="text-xs text-[var(--f-text-3)] uppercase">Avg Age</span>
        </div>
        <p className="text-xl font-bold text-[var(--f-warn)]">{stats.avgAge}h</p>
      </div>
      <div className="az-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-3.5 h-3.5 text-[var(--f-info)]" />
          <span className="text-xs text-[var(--f-text-3)] uppercase">At Risk</span>
        </div>
        <p className="text-xl font-bold text-[var(--f-info)]">${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
      </div>
    </div>
  );
}

// ── Escalation Banner ───────────────────────────────────────────────────────
function EscalationBanner({ escalatedCount }) {
  if (escalatedCount === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--f-bad)10] border border-[var(--f-bad)30] rounded-xl ">
      <div className="w-8 h-8 rounded-lg bg-[var(--f-bad)22] flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-[var(--f-bad)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-[var(--f-bad)]">SLA Escalation</p>
        <p className="text-xs text-[var(--f-text-2)]">
          {escalatedCount} {escalatedCount === 1 ? 'dispute has' : 'disputes have'} been open for more than 4 hours.
          Immediate attention required.
        </p>
      </div>
    </div>
  );
}

// ── Main War Room Page ────────────────────────────────────────────────────────
export default function WarRoom() {
  const { data: disputes = [], isLoading, refetch } = useDisputes();
  const { data: liveTrades = [] } = useQuery({
    queryKey: ['admin', 'live-trades'],
    queryFn: () => api.trades.live(),
    refetchInterval: 15000,
  });

  const statusColors = {
    PAID:            'bg-[var(--f-ok)22] text-[var(--f-ok)] border-[var(--f-ok)40]',
    PENDING_PAYMENT: 'bg-warn-bg text-[var(--f-warn)] border-[var(--f-warn)40]',
    DISPUTED:        'bg-[var(--f-bad)22] text-[var(--f-bad)] border-[var(--f-bad)40]',
    COMPLETED:       'bg-[var(--f-info)22] text-[var(--f-info)] border-[var(--f-info)40]',
  };

  // Count escalated disputes (open > 4h)
  const escalatedCount = useMemo(
    () => disputes.filter(d => getSLA(d.createdAt).level === 'critical').length,
    [disputes]
  );

  return (
    <div className="space-y-6 ">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--f-bad)22] rounded-xl flex items-center justify-center az-glow-red">
            <Swords className="w-4.5 h-4.5 text-[var(--f-bad)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--f-text)]">War Room</h1>
            <p className="text-xs text-[var(--f-text-3)]">
              <span className="text-[var(--f-bad)] font-semibold">{disputes.length}</span> active disputes
              {' · '}
              <span className="text-[var(--f-warn)] font-semibold">{Array.isArray(liveTrades) ? liveTrades.length : 0}</span> live trades
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-[var(--f-line-strong)] text-[var(--f-text-2)] hover:bg-[var(--f-surface-raised)] hover:text-[var(--f-text)] text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Summary stats */}
      {!isLoading && disputes.length > 0 && <SummaryBar disputes={disputes} />}

      {/* Escalation banner */}
      <EscalationBanner escalatedCount={escalatedCount} />

      {/* Active Disputes */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-widest">
          Active Disputes
        </h2>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="az-card h-20 az-shimmer" />
            ))}
          </div>
        )}
        {disputes.map((d) => <DisputeCard key={d.id} dispute={d} allDisputes={disputes} />)}
        {!isLoading && disputes.length === 0 && (
          <div className="text-center py-12 az-card">
            <div className="w-10 h-10 bg-[var(--f-ok)22] rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-[var(--f-ok)]" />
            </div>
            <p className="text-sm font-medium text-[var(--f-text-2)]">No active disputes</p>
            <p className="text-xs text-[var(--f-text-3)] mt-1">The platform is clean ✓</p>
          </div>
        )}
      </div>

      {/* Live Trades */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-widest">
          Live Trades ({Array.isArray(liveTrades) ? liveTrades.length : 0})
        </h2>
        <div className="az-card overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-4 py-2.5 border-b border-[var(--f-line)] text-xs text-[var(--f-text-3)] uppercase tracking-wider">
            <span>ID</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Buyer</span>
            <span>Vendor</span>
          </div>
          {Array.isArray(liveTrades) && liveTrades.map((t) => (
            <div
              key={t.id}
              className="az-table-row grid grid-cols-5 gap-4 px-4 py-3 text-sm last:border-0"
            >
              <span className="f-mono text-xs text-[var(--f-text-3)] truncate">#{t.id}</span>
              <span className="font-semibold text-[var(--f-text)] f-mono">${t.amount}</span>
              <Tag className={`text-xs border w-fit ${statusColors[t.status] || 'bg-[var(--f-line)] text-[var(--f-text-2)] border-[var(--f-line-strong)]'}`}>
                {t.status}
              </Tag>
              <span className="text-[var(--f-text-2)] truncate">{t.buyer?.name || t.user?.username || '–'}</span>
              <span className="text-[var(--f-text-2)] truncate">{t.vendor?.name || t.vendor?.username || '–'}</span>
            </div>
          ))}
          {(!Array.isArray(liveTrades) || liveTrades.length === 0) && (
            <p className="text-[var(--f-text-3)] text-sm text-center py-8">No live trades</p>
          )}
        </div>
      </div>
    </div>
  );
}
