import { useState } from 'react';
import { useDisputes } from '@/lib/useAdminData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Swords, MessageSquare, CheckCircle, XCircle, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const RULINGS = [
  { value: 'BUYER_WINS',  label: 'Buyer Wins',  color: 'text-[#00d97e]', active: 'border-[#00d97e] bg-[#00d97e10]' },
  { value: 'VENDOR_WINS', label: 'Vendor Wins', color: 'text-[#4f8ef7]', active: 'border-[#4f8ef7] bg-[#4f8ef710]' },
  { value: 'SPLIT',       label: 'Split Funds', color: 'text-[#f59e0b]', active: 'border-[#f59e0b] bg-[#f59e0b10]' },
];

// ── Extreme Ruling Confirmation Modal ────────────────────────────────────────
function ExtremeRulingModal({ pending, onConfirm, onCancel }) {
  if (!pending) return null;
  const { buyerPercent } = pending;
  const vendorPercent = 100 - buyerPercent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative az-card az-glow-amber w-full max-w-md mx-4 p-6 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b22] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#f59e0b]">⚠ Extreme Ruling</h2>
            <p className="text-xs text-[#7b7b9a] mt-0.5">This split is outside the normal 5–95% range</p>
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#0f0f17] border border-[#2a2a3e] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7b7b9a]">Buyer receives</span>
            <span className="font-bold text-[#e8e8f0] az-mono">{buyerPercent}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7b7b9a]">Vendor receives</span>
            <span className="font-bold text-[#e8e8f0] az-mono">{vendorPercent}%</span>
          </div>
        </div>

        <p className="text-sm text-[#7b7b9a] leading-relaxed">
          You are assigning <span className="text-[#e8e8f0] font-semibold">{buyerPercent}%</span> to the buyer and{' '}
          <span className="text-[#e8e8f0] font-semibold">{vendorPercent}%</span> to the vendor.
          This is an unusual split. Are you absolutely certain?
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            className="flex-1 border border-[#2a2a3e] text-[#7b7b9a] hover:text-[#e8e8f0] hover:bg-[#1e1e2e]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 border border-[#f43f5e] bg-transparent text-[#f43f5e] hover:bg-[#f43f5e15] font-semibold"
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

// ── Reason Input Modal (replaces prompt() anti-pattern) ──────────────────────
function ReasonModal({ open, title, placeholder, confirmLabel, onConfirm, onCancel, isPending }) {
  const [reason, setReason] = useState('');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative az-card w-full max-w-md mx-4 p-6 space-y-4 animate-fade-in">
        <h2 className="text-base font-bold text-[#e8e8f0]">{title}</h2>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          className="bg-[#0a0a0f] border-[#2a2a3e] text-[#e8e8f0] focus:border-[#4f8ef740] placeholder:text-[#4a4a6a] min-h-[80px]"
          autoFocus
        />
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 border border-[#2a2a3e] text-[#7b7b9a] hover:text-[#e8e8f0] hover:bg-[#1e1e2e]"
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

// ── Dispute Card ─────────────────────────────────────────────────────────────
function DisputeCard({ dispute }) {
  const [expanded, setExpanded]   = useState(false);
  const [ruling, setRuling]       = useState('BUYER_WINS');
  const [reason, setReason]       = useState('');
  const [buyerPct, setBuyerPct]   = useState(50);
  const [injectMsg, setInjectMsg] = useState('');
  const [tab, setTab]             = useState('resolve');

  // Phase ADMIN-CONTROL-2: extreme ruling state
  const [extremeRulingPending, setExtremeRulingPending] = useState(null);

  // Reason modal state (replaces prompt())
  const [reasonModal, setReasonModal] = useState(null); // { type: 'release' | 'cancel' }

  const qc = useQueryClient();

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
      // Phase ADMIN-CONTROL-2 FIX A: handle 422 EXTREME_RULING_REQUIRES_OVERRIDE
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
          className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[#0f0f17] transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs az-mono text-[#7b7b9a]">#{dispute.id}</span>
              <Badge className="bg-[#f43f5e22] text-[#f43f5e] border-[#f43f5e40] text-xs font-medium">
                DISPUTED
              </Badge>
              <span className="text-sm font-bold text-[#e8e8f0]">
                ${dispute.amount} <span className="text-[#7b7b9a] font-normal">{dispute.currency}</span>
              </span>
              <span className="text-xs text-[#4a4a6a] bg-[#1e1e2e] px-2 py-0.5 rounded-full">
                {dispute.paymentMethod}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-[#4a4a6a]">
              <span>Buyer: <span className="text-[#7b7b9a]">{dispute.buyer?.name}</span></span>
              <span>Vendor: <span className="text-[#7b7b9a]">{dispute.vendor?.name}</span></span>
            </div>
          </div>
          <span className="text-xs text-[#4a4a6a] flex-shrink-0 mt-1">
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </span>
        </div>

        {expanded && (
          <div className="border-t border-[#1e1e2e] p-4 space-y-4">
            {/* Chat messages */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(dispute.messages || []).map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'buyer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`rounded-xl px-3 py-2 max-w-xs text-xs ${
                    m.sender === 'buyer'
                      ? 'bg-[#1e1e2e] text-[#7b7b9a]'
                      : 'bg-[#4f8ef722] text-[#4f8ef7]'
                  }`}>
                    <p className="font-semibold mb-0.5 capitalize">{m.sender}</p>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {(!dispute.messages || dispute.messages.length === 0) && (
                <p className="text-xs text-[#4a4a6a] text-center py-2">No messages in this dispute</p>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-[#0a0a0f] rounded-xl p-1 border border-[#1e1e2e]">
              {[['resolve', 'Resolve'], ['inject', 'Inject'], ['quick', 'Quick Actions']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                    tab === t
                      ? 'bg-[#13131e] text-[#e8e8f0] font-medium shadow-sm'
                      : 'text-[#4a4a6a] hover:text-[#7b7b9a]'
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
                          : 'border-[#2a2a3e] text-[#7b7b9a] hover:bg-[#13131e]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {ruling === 'SPLIT' && (
                  <div>
                    <label className="text-xs text-[#4a4a6a] block mb-1">Buyer share: {buyerPct}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={buyerPct}
                      onChange={(e) => setBuyerPct(parseInt(e.target.value))}
                      className="w-full accent-[#4f8ef7]"
                    />
                  </div>
                )}

                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for ruling (required)…"
                  className="bg-[#0a0a0f] border-[#2a2a3e] text-[#e8e8f0] focus:border-[#4f8ef740] placeholder:text-[#4a4a6a]"
                />

                <Button
                  onClick={handleResolve}
                  disabled={!reason.trim() || resolve.isPending}
                  className="w-full bg-[#4f8ef7] hover:bg-[#3d7ef0] text-white font-semibold text-sm"
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
                  className="bg-[#0a0a0f] border-[#2a2a3e] text-[#e8e8f0] focus:border-[#4f8ef740] placeholder:text-[#4a4a6a]"
                />
                <Button
                  onClick={() => inject.mutate({ id: dispute.id, message: injectMsg })}
                  disabled={!injectMsg || inject.isPending}
                  className="w-full bg-[#4f8ef7] hover:bg-[#3d7ef0] text-white font-semibold text-sm"
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
                  className="border-[#00d97e40] text-[#00d97e] hover:bg-[#00d97e10] text-sm"
                  disabled={forceRelease.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-2" />
                  Force Release
                </Button>
                <Button
                  onClick={() => setReasonModal({ type: 'cancel' })}
                  variant="outline"
                  className="border-[#f43f5e40] text-[#f43f5e] hover:bg-[#f43f5e10] text-sm"
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

// ── Main War Room Page ────────────────────────────────────────────────────────
export default function WarRoom() {
  const { data: disputes = [], isLoading, refetch } = useDisputes();
  const { data: liveTrades = [] } = useQuery({
    queryKey: ['admin', 'live-trades'],
    queryFn: () => api.trades.live(),
    refetchInterval: 15000,
  });

  const statusColors = {
    PAID:            'bg-[#00d97e22] text-[#00d97e] border-[#00d97e40]',
    PENDING_PAYMENT: 'bg-[#f59e0b22] text-[#f59e0b] border-[#f59e0b40]',
    DISPUTED:        'bg-[#f43f5e22] text-[#f43f5e] border-[#f43f5e40]',
    COMPLETED:       'bg-[#4f8ef722] text-[#4f8ef7] border-[#4f8ef740]',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f43f5e22] rounded-xl flex items-center justify-center az-glow-red">
            <Swords className="w-4.5 h-4.5 text-[#f43f5e]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e8e8f0]">War Room</h1>
            <p className="text-xs text-[#4a4a6a]">
              <span className="text-[#f43f5e] font-semibold">{disputes.length}</span> active disputes
              {' · '}
              <span className="text-[#f59e0b] font-semibold">{Array.isArray(liveTrades) ? liveTrades.length : 0}</span> live trades
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-[#2a2a3e] text-[#7b7b9a] hover:bg-[#13131e] hover:text-[#e8e8f0] text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Active Disputes */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[#4a4a6a] uppercase tracking-widest">
          Active Disputes
        </h2>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="az-card h-20 az-shimmer" />
            ))}
          </div>
        )}
        {disputes.map((d) => <DisputeCard key={d.id} dispute={d} />)}
        {!isLoading && disputes.length === 0 && (
          <div className="text-center py-12 az-card">
            <div className="w-10 h-10 bg-[#00d97e22] rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-[#00d97e]" />
            </div>
            <p className="text-sm font-medium text-[#7b7b9a]">No active disputes</p>
            <p className="text-xs text-[#4a4a6a] mt-1">The platform is clean ✓</p>
          </div>
        )}
      </div>

      {/* Live Trades */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[#4a4a6a] uppercase tracking-widest">
          Live Trades ({Array.isArray(liveTrades) ? liveTrades.length : 0})
        </h2>
        <div className="az-card overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-4 py-2.5 border-b border-[#1e1e2e] text-xs text-[#4a4a6a] uppercase tracking-wider">
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
              <span className="az-mono text-xs text-[#4a4a6a] truncate">#{t.id}</span>
              <span className="font-semibold text-[#e8e8f0] az-mono">${t.amount}</span>
              <Badge className={`text-xs border w-fit ${statusColors[t.status] || 'bg-[#1e1e2e] text-[#7b7b9a] border-[#2a2a3e]'}`}>
                {t.status}
              </Badge>
              <span className="text-[#7b7b9a] truncate">{t.buyer?.name || '–'}</span>
              <span className="text-[#7b7b9a] truncate">{t.vendor?.name || '–'}</span>
            </div>
          ))}
          {(!Array.isArray(liveTrades) || liveTrades.length === 0) && (
            <p className="text-[#4a4a6a] text-sm text-center py-8">No live trades</p>
          )}
        </div>
      </div>
    </div>
  );
}
