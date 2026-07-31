import { useState, useMemo, useEffect } from 'react';
import { useDisputes } from '@/lib/useAdminData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Swords, MessageSquare, CheckCircle, XCircle, RefreshCw,
  AlertTriangle, ShieldAlert, Clock, Flame, Users, History,
  FileSearch,
} from 'lucide-react';
import { toast } from 'sonner';

const RULINGS = [
  { value: 'BUYER_WINS',  label: 'Buyer Wins',  color: 'text-[var(--az-emerald)]', active: 'border-[var(--az-emerald)] bg-[var(--az-emerald)10]' },
  { value: 'VENDOR_WINS', label: 'Vendor Wins', color: 'text-[var(--az-blue)]', active: 'border-[var(--az-blue)] bg-[var(--az-blue)10]' },
  { value: 'SPLIT',       label: 'Split Funds', color: 'text-[var(--az-amber)]', active: 'border-[var(--az-amber)] bg-[var(--az-amber)10]' },
];

/* ── SLA Timer ───────────────────────────────────────────────────────────── */
function getSLA(createdAt) {
  if (!createdAt) return { hours: 0, level: 'normal', label: '—' };
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = diff / 36e5;
  let level, label;
  if (hours < 1) {
    level = 'normal'; label = `${Math.floor(diff / 60000)}m`;
  } else if (hours < 4) {
    level = 'warning'; label = `${hours.toFixed(1)}h`;
  } else {
    level = 'critical'; label = `${Math.floor(hours)}h`;
  }
  return { hours, level, label };
}

const SLA_STYLES = {
  normal: { badge: 'bg-[var(--az-emerald-soft)] text-[var(--az-emerald)] border-[var(--az-emerald-glow)]', dot: 'bg-emerald-400' },
  warning: { badge: 'bg-[var(--az-amber-soft)] text-[var(--az-amber)] border-[var(--az-amber-soft)]', dot: 'bg-amber-400' },
  critical: { badge: 'bg-[var(--az-red-soft)] text-[var(--az-red)] border-[var(--az-red-glow)]', dot: 'bg-red-400' },
};

function SLATimer({ createdAt }) {
  const [, setTick] = useState(0);
  // Re-render every 30s to keep the timer fresh
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const sla = getSLA(createdAt);
  const style = SLA_STYLES[sla.level];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${sla.level === 'critical' ? 'animate-pulse' : ''}`} />
      <Clock className="w-3 h-3" />
      {sla.label}
    </span>
  );
}

/* ── Dispute pattern detection ────────────────────────────────────────────── */
function detectPatterns(allDisputes, currentDispute) {
  const patterns = [];

  // Get the user/vendor IDs for the current dispute
  const buyerId = currentDispute.user?.id || currentDispute.buyer?.id;
  const vendorId = currentDispute.vendor?.id;
  const buyerName = currentDispute.user?.username || currentDispute.buyer?.name || 'Buyer';
  const vendorName = currentDispute.vendor?.username || currentDispute.vendor?.name || 'Vendor';

  // Count how many other active disputes involve the same buyer or vendor
  const sameBuyer = allDisputes.filter(d => d.id !== currentDispute.id && (d.user?.id || d.buyer?.id) === buyerId);
  const sameVendor = allDisputes.filter(d => d.id !== currentDispute.id && d.vendor?.id === vendorId);

  if (sameBuyer.length >= 2) {
    patterns.push({
      type: 'buyer_repeat',
      level: 'high',
      label: `${buyerName} has ${sameBuyer.length} other active disputes`,
      icon: Users,
    });
  } else if (sameBuyer.length === 1) {
    patterns.push({
      type: 'buyer_repeat',
      level: 'medium',
      label: `${buyerName} has 1 other active dispute`,
      icon: Users,
    });
  }

  if (sameVendor.length >= 2) {
    patterns.push({
      type: 'vendor_repeat',
      level: 'high',
      label: `${vendorName} has ${sameVendor.length} other active disputes`,
      icon: Users,
    });
  } else if (sameVendor.length === 1) {
    patterns.push({
      type: 'vendor_repeat',
      level: 'medium',
      label: `${vendorName} has 1 other active dispute`,
      icon: Users,
    });
  }

  // High-value dispute flag
  const amount = Number(currentDispute.amount) || 0;
  if (amount >= 5000) {
    patterns.push({
      type: 'high_value',
      level: 'warning',
      label: 'High-value dispute ($5K+)',
      icon: Flame,
    });
  }

  return patterns;
}

// ── Extreme Ruling Confirmation Modal ────────────────────────────────────────
function ExtremeRulingModal({ pending, onConfirm, onCancel }) {
  if (!pending) return null;
  const { buyerPercent } = pending;
  const vendorPercent = 100 - buyerPercent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative az-card az-glow-amber w-full max-w-md mx-4 p-6 space-y-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--az-amber)22] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--az-amber)]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--az-amber)]">⚠ Extreme Ruling</h2>
            <p className="text-xs text-[var(--az-text-secondary)] mt-0.5">This split is outside the normal 5–95% range</p>
          </div>
        </div>
        <div className="bg-[var(--az-surface-1)] border border-[var(--az-border-bright)] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--az-text-secondary)]">Buyer receives</span>
            <span className="font-bold text-[var(--az-text-primary)] az-mono">{buyerPercent}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--az-text-secondary)]">Vendor receives</span>
            <span className="font-bold text-[var(--az-text-primary)] az-mono">{vendorPercent}%</span>
          </div>
        </div>
        <p className="text-sm text-[var(--az-text-secondary)] leading-relaxed">
          You are assigning <span className="text-[var(--az-text-primary)] font-semibold">{buyerPercent}%</span> to the buyer and{' '}
          <span className="text-[var(--az-text-primary)] font-semibold">{vendorPercent}%</span> to the vendor.
          This is an unusual split. Are you absolutely certain?
        </p>
        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            className="flex-1 border border-[var(--az-border-bright)] text-[var(--az-text-secondary)] hover:text-[var(--az-text-primary)] hover:bg-[var(--az-border)]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 border border-[var(--az-red)] bg-transparent text-[var(--az-red)] hover:bg-[var(--az-red)15] font-semibold"
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative az-card w-full max-w-md mx-4 p-6 space-y-4 animate-fade-in">
        <h2 className="text-base font-bold text-[var(--az-text-primary)]">{title}</h2>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          className="bg-[var(--az-bg)] border-[var(--az-border-bright)] text-[var(--az-text-primary)] focus:border-[var(--az-blue)40] placeholder:text-[var(--az-text-muted)] min-h-[80px]"
          autoFocus
        />
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 border border-[var(--az-border-bright)] text-[var(--az-text-secondary)] hover:text-[var(--az-text-primary)] hover:bg-[var(--az-border)]"
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
    high: 'bg-[var(--az-red-soft)] border-[var(--az-red-glow)] text-[var(--az-red)]',
    medium: 'bg-[var(--az-amber-soft)] border-[var(--az-amber-soft)] text-[var(--az-amber)]',
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
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--az-text-secondary)]">
        <FileSearch className="w-3.5 h-3.5" />
        EVIDENCE & CONTEXT
      </div>
      <div className="bg-[var(--az-bg)] border border-[var(--az-border)] rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
        {evidenceMessages.length === 0 ? (
          <p className="text-xs text-[var(--az-text-muted)] italic">No evidence messages in this dispute</p>
        ) : (
          evidenceMessages.slice(0, 5).map((m, i) => (
            <div key={i} className="text-xs">
              <span className={`font-semibold capitalize ${
                m.sender === 'system' ? 'text-[var(--az-text-muted)]' :
                m.sender === 'admin' ? 'text-[var(--az-amber)]' :
                m.sender === 'buyer' ? 'text-[var(--az-blue)]' : 'text-[var(--az-emerald)]'
              }`}>{m.sender}:</span>{' '}
              <span className="text-[var(--az-text-secondary)]">{m.text}</span>
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
    onSuccess: () => { toast.success('Escrow released to buyer'); qc.invalidateQueries({ queryKey: ['admin', 'disputes'] }); },
    onError: (e) => toast.error(e.message || 'Force release failed'),
  });

  const forceCancel = useMutation({
    mutationFn: ({ id, reason }) => api.trades.forceCancel(id, reason),
    onSuccess: () => { toast.success('Trade cancelled, escrow returned to vendor'); qc.invalidateQueries({ queryKey: ['admin', 'disputes'] }); },
    onError: (e) => toast.error(e.message || 'Force cancel failed'),
  });

  const resolve = useMutation({
    mutationFn: ({ id, ruling, reason, buyerPercent, override }) =>
      api.trades.resolve(id, ruling, reason, buyerPercent, override),
    onSuccess: () => {
      toast.success('Dispute resolved');
      setExtremeRulingPending(null);
      qc.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
    onError: (err) => {
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
          className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[var(--az-surface-1)] transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs az-mono text-[var(--az-text-secondary)]">#{dispute.id}</span>
              <Badge className="bg-[var(--az-red)22] text-[var(--az-red)] border-[var(--az-red)40] text-xs font-medium">
                DISPUTED
              </Badge>
              <span className="text-sm font-bold text-[var(--az-text-primary)]">
                ${dispute.amount} <span className="text-[var(--az-text-secondary)] font-normal">{dispute.currency}</span>
              </span>
              <span className="text-xs text-[var(--az-text-muted)] bg-[var(--az-border)] px-2 py-0.5 rounded-full">
                {dispute.paymentMethod}
              </span>
              {/* SLA Timer */}
              <SLATimer createdAt={dispute.createdAt} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-[var(--az-text-muted)]">
              <span>Buyer: <span className="text-[var(--az-text-secondary)]">{buyerName}</span></span>
              <span>Vendor: <span className="text-[var(--az-text-secondary)]">{vendorName}</span></span>
            </div>
          </div>
          <span className="text-xs text-[var(--az-text-muted)] flex-shrink-0 mt-1">
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </span>
        </div>

        {expanded && (
          <div className="border-t border-[var(--az-border)] p-4 space-y-4">
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
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--az-text-secondary)]">
                <MessageSquare className="w-3.5 h-3.5" />
                CHAT HISTORY
              </div>
              {(dispute.messages || []).map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'buyer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`rounded-xl px-3 py-2 max-w-xs text-xs ${
                    m.sender === 'buyer'
                      ? 'bg-[var(--az-border)] text-[var(--az-text-secondary)]'
                      : 'bg-[var(--az-blue)22] text-[var(--az-blue)]'
                  }`}>
                    <p className="font-semibold mb-0.5 capitalize">{m.sender}</p>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {(!dispute.messages || dispute.messages.length === 0) && (
                <p className="text-xs text-[var(--az-text-muted)] text-center py-2">No messages in this dispute</p>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-[var(--az-bg)] rounded-xl p-1 border border-[var(--az-border)]">
              {[['resolve', 'Resolve'], ['inject', 'Inject'], ['quick', 'Quick Actions']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                    tab === t
                      ? 'bg-[var(--az-surface-2)] text-[var(--az-text-primary)] font-medium shadow-sm'
                      : 'text-[var(--az-text-muted)] hover:text-[var(--az-text-secondary)]'
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
                          : 'border-[var(--az-border-bright)] text-[var(--az-text-secondary)] hover:bg-[var(--az-surface-2)]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {ruling === 'SPLIT' && (
                  <div>
                    <label className="text-xs text-[var(--az-text-muted)] block mb-1">Buyer share: {buyerPct}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={buyerPct}
                      onChange={(e) => setBuyerPct(parseInt(e.target.value))}
                      className="w-full accent-[var(--az-blue)]"
                    />
                  </div>
                )}

                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for ruling (required)…"
                  className="bg-[var(--az-bg)] border-[var(--az-border-bright)] text-[var(--az-text-primary)] focus:border-[var(--az-blue)40] placeholder:text-[var(--az-text-muted)]"
                />

                <Button
                  onClick={handleResolve}
                  disabled={!reason.trim() || resolve.isPending}
                  className="w-full bg-[var(--az-blue)] hover:bg-[#3d7ef0] text-[var(--az-text-primary)] font-semibold text-sm"
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
                  className="bg-[var(--az-bg)] border-[var(--az-border-bright)] text-[var(--az-text-primary)] focus:border-[var(--az-blue)40] placeholder:text-[var(--az-text-muted)]"
                />
                <Button
                  onClick={() => inject.mutate({ id: dispute.id, message: injectMsg })}
                  disabled={!injectMsg || inject.isPending}
                  className="w-full bg-[var(--az-blue)] hover:bg-[#3d7ef0] text-[var(--az-text-primary)] font-semibold text-sm"
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
                  className="border-[var(--az-emerald)40] text-[var(--az-emerald)] hover:bg-[var(--az-emerald)10] text-sm"
                  disabled={forceRelease.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-2" />
                  Force Release
                </Button>
                <Button
                  onClick={() => setReasonModal({ type: 'cancel' })}
                  variant="outline"
                  className="border-[var(--az-red)40] text-[var(--az-red)] hover:bg-[var(--az-red)10] text-sm"
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
          <Swords className="w-3.5 h-3.5 text-[var(--az-red)]" />
          <span className="text-xs text-[var(--az-text-muted)] uppercase">Total Disputes</span>
        </div>
        <p className="text-xl font-bold text-[var(--az-text-primary)]">{stats.total}</p>
      </div>
      <div className={`az-card p-3 ${stats.escalated > 0 ? 'border-[var(--az-red)40]' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-3.5 h-3.5 text-[var(--az-red)]" />
          <span className="text-xs text-[var(--az-text-muted)] uppercase">SLA Breached</span>
        </div>
        <p className={`text-xl font-bold ${stats.escalated > 0 ? 'text-[var(--az-red)]' : 'text-[var(--az-emerald)]'}`}>{stats.escalated}</p>
      </div>
      <div className="az-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-[var(--az-amber)]" />
          <span className="text-xs text-[var(--az-text-muted)] uppercase">Avg Age</span>
        </div>
        <p className="text-xl font-bold text-[var(--az-amber)]">{stats.avgAge}h</p>
      </div>
      <div className="az-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-3.5 h-3.5 text-[var(--az-blue)]" />
          <span className="text-xs text-[var(--az-text-muted)] uppercase">At Risk</span>
        </div>
        <p className="text-xl font-bold text-[var(--az-blue)]">${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
      </div>
    </div>
  );
}

// ── Escalation Banner ───────────────────────────────────────────────────────
function EscalationBanner({ escalatedCount }) {
  if (escalatedCount === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--az-red)10] border border-[var(--az-red)30] rounded-xl animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-[var(--az-red)22] flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-[var(--az-red)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-[var(--az-red)]">SLA Escalation</p>
        <p className="text-xs text-[var(--az-text-secondary)]">
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
    PAID:            'bg-[var(--az-emerald)22] text-[var(--az-emerald)] border-[var(--az-emerald)40]',
    PENDING_PAYMENT: 'bg-[var(--az-amber)22] text-[var(--az-amber)] border-[var(--az-amber)40]',
    DISPUTED:        'bg-[var(--az-red)22] text-[var(--az-red)] border-[var(--az-red)40]',
    COMPLETED:       'bg-[var(--az-blue)22] text-[var(--az-blue)] border-[var(--az-blue)40]',
  };

  // Count escalated disputes (open > 4h)
  const escalatedCount = useMemo(
    () => disputes.filter(d => getSLA(d.createdAt).level === 'critical').length,
    [disputes]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--az-red)22] rounded-xl flex items-center justify-center az-glow-red">
            <Swords className="w-4.5 h-4.5 text-[var(--az-red)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--az-text-primary)]">War Room</h1>
            <p className="text-xs text-[var(--az-text-muted)]">
              <span className="text-[var(--az-red)] font-semibold">{disputes.length}</span> active disputes
              {' · '}
              <span className="text-[var(--az-amber)] font-semibold">{Array.isArray(liveTrades) ? liveTrades.length : 0}</span> live trades
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-[var(--az-border-bright)] text-[var(--az-text-secondary)] hover:bg-[var(--az-surface-2)] hover:text-[var(--az-text-primary)] text-xs"
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
        <h2 className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-widest">
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
            <div className="w-10 h-10 bg-[var(--az-emerald)22] rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-[var(--az-emerald)]" />
            </div>
            <p className="text-sm font-medium text-[var(--az-text-secondary)]">No active disputes</p>
            <p className="text-xs text-[var(--az-text-muted)] mt-1">The platform is clean ✓</p>
          </div>
        )}
      </div>

      {/* Live Trades */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-widest">
          Live Trades ({Array.isArray(liveTrades) ? liveTrades.length : 0})
        </h2>
        <div className="az-card overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-4 py-2.5 border-b border-[var(--az-border)] text-xs text-[var(--az-text-muted)] uppercase tracking-wider">
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
              <span className="az-mono text-xs text-[var(--az-text-muted)] truncate">#{t.id}</span>
              <span className="font-semibold text-[var(--az-text-primary)] az-mono">${t.amount}</span>
              <Badge className={`text-xs border w-fit ${statusColors[t.status] || 'bg-[var(--az-border)] text-[var(--az-text-secondary)] border-[var(--az-border-bright)]'}`}>
                {t.status}
              </Badge>
              <span className="text-[var(--az-text-secondary)] truncate">{t.buyer?.name || t.user?.username || '–'}</span>
              <span className="text-[var(--az-text-secondary)] truncate">{t.vendor?.name || t.vendor?.username || '–'}</span>
            </div>
          ))}
          {(!Array.isArray(liveTrades) || liveTrades.length === 0) && (
            <p className="text-[var(--az-text-muted)] text-sm text-center py-8">No live trades</p>
          )}
        </div>
      </div>
    </div>
  );
}
