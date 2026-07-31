import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { escrow as escrowApi } from '@/lib/api';
import StatCard from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowRight, ShieldAlert, AlertTriangle, Scale, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const RULINGS = [
  { value: 'FULL_RELEASE', label: 'Full Release', desc: '100% to Payee (Seller)', color: 'text-[var(--az-emerald)]', active: 'border-emerald-500/50 bg-[var(--az-emerald-soft)]' },
  { value: 'FULL_REFUND',  label: 'Full Refund',  desc: '100% to Payer (Buyer)',  color: 'text-[var(--az-blue)]',    active: 'border-blue-500/50 bg-[var(--az-blue-soft)]' },
  { value: 'SPLIT',        label: 'Custom Split',  desc: 'Set custom percentages', color: 'text-[var(--az-amber)]',   active: 'border-amber-500/50 bg-[var(--az-amber-soft)]' },
];

const DISPUTE_STATUS_STYLE = {
  PENDING:      'bg-[#f43f5e22] text-[#f43f5e] border-[#f43f5e40]',
  ASSIGNED:     'bg-[#f59e0b22] text-[#f59e0b] border-[#f59e0b40]',
  UNDER_REVIEW: 'bg-[#f59e0b22] text-[#f59e0b] border-[#f59e0b40]',
  RESOLVED:     'bg-[#00d97e22] text-[#00d97e] border-[#00d97e40]',
};

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function usdc(v) { return `${num(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`; }

// Client-side extreme-ruling confirmation (no server override exists for escrow).
function ExtremeRulingModal({ pending, onConfirm, onCancel }) {
  if (!pending) return null;
  const { payerPct, payeePct } = pending;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative az-card az-glow-amber w-full max-w-md mx-4 p-6 space-y-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b22] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#f59e0b]">⚠ Extreme Ruling</h2>
            <p className="text-xs text-[#7b7b9a] mt-0.5">This split is outside the normal 5–95% range</p>
          </div>
        </div>
        <div className="bg-[#0f0f17] border border-[#2a2a3e] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7b7b9a]">Payer (Buyer) receives</span>
            <span className="font-bold text-[#e8e8f0] az-mono">{payerPct}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7b7b9a]">Payee (Seller) receives</span>
            <span className="font-bold text-[#e8e8f0] az-mono">{payeePct}%</span>
          </div>
        </div>
        <p className="text-sm text-[#7b7b9a] leading-relaxed">This is an unusual split. Are you absolutely certain?</p>
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" className="flex-1 border border-[#2a2a3e] text-[#7b7b9a] hover:text-[#e8e8f0] hover:bg-[#1e1e2e]" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1 border border-[#f43f5e] bg-transparent text-[#f43f5e] hover:bg-[#f43f5e15] font-semibold" onClick={onConfirm}>
            <ShieldAlert className="w-4 h-4 mr-2" /> Confirm Extreme Ruling
          </Button>
        </div>
      </div>
    </div>
  );
}

function EscrowDisputeCard({ dispute }) {
  const [expanded, setExpanded] = useState(false);
  const [ruling, setRuling] = useState('');
  const [notes, setNotes] = useState('');
  const [payerPct, setPayerPct] = useState(50);
  const [extremeModalPending, setExtremeModalPending] = useState(null);
  const qc = useQueryClient();

  const e = dispute.escrow || {};
  const amount = num(e.amountUsdc);
  const payeePct = 100 - (parseInt(payerPct, 10) || 0);

  const resolveMutation = useMutation({
    mutationFn: ({ ruling, notes, payerPct, payeePct }) =>
      escrowApi.resolve(dispute.id, ruling, notes, payerPct, payeePct),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escrow-disputes'] }); toast.success('Ruling issued — funds moved'); setExtremeModalPending(null); },
    onError: (err) => toast.error(err.message || 'Resolution failed'),
  });

  const submit = (override = false) => {
    const p = parseInt(payerPct, 10) || 0;
    if (ruling === 'SPLIT') {
      if (!override && (p < 5 || p > 95)) { setExtremeModalPending({ payerPct: p, payeePct: 100 - p }); return; }
      resolveMutation.mutate({ ruling, notes, payerPct: p, payeePct: 100 - p });
      return;
    }
    resolveMutation.mutate({
      ruling, notes,
      payerPct: ruling === 'FULL_REFUND' ? 100 : 0,
      payeePct: ruling === 'FULL_RELEASE' ? 100 : 0,
    });
  };

  const isResolved = dispute.status === 'RESOLVED';

  return (
    <>
      <ExtremeRulingModal pending={extremeModalPending} onConfirm={() => submit(true)} onCancel={() => setExtremeModalPending(null)} />

      <div className="az-card overflow-hidden transition-all duration-200">
        {/* Collapsed header */}
        <div className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[#0f0f17] transition-colors" onClick={() => setExpanded(!expanded)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs az-mono text-[#7b7b9a] truncate">#{String(dispute.escrowId).slice(0, 8)}</span>
              <Badge className={`text-xs border font-medium ${DISPUTE_STATUS_STYLE[dispute.status] || 'bg-[#1e1e2e] text-[#7b7b9a] border-[#2a2a3e]'}`}>{dispute.status}</Badge>
              <span className="text-sm font-bold text-[#e8e8f0]">{usdc(amount)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-[#4a4a6a]">
              <span className="text-[#7b7b9a]">{e.payer?.username || '—'}</span>
              <ArrowRight className="w-3 h-3" />
              <span className="text-[#7b7b9a]">{e.payee?.username || '—'}</span>
            </div>
          </div>
          <span className="text-xs text-[#4a4a6a] flex-shrink-0 mt-1">{expanded ? '▲ Collapse' : '▼ Review'}</span>
        </div>

        {expanded && (
          <div className="border-t border-[#1e1e2e] p-4 space-y-4">
            {/* Escrow details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0f0f17] border border-[#1e1e2e] rounded-xl p-3">
                <p className="text-[#4a4a6a]">Amount</p>
                <p className="text-[#e8e8f0] font-bold az-mono mt-0.5">{usdc(amount)}</p>
              </div>
              <div className="bg-[#0f0f17] border border-[#1e1e2e] rounded-xl p-3">
                <p className="text-[#4a4a6a]">Fee</p>
                <p className="text-[#e8e8f0] font-bold az-mono mt-0.5">{usdc(e.feeUsdc)}</p>
              </div>
              <div className="bg-[#0f0f17] border border-[#1e1e2e] rounded-xl p-3">
                <p className="text-[#4a4a6a]">Payer (Buyer)</p>
                <p className="text-[#e8e8f0] mt-0.5">{e.payer?.username || '—'}</p>
              </div>
              <div className="bg-[#0f0f17] border border-[#1e1e2e] rounded-xl p-3">
                <p className="text-[#4a4a6a]">Payee (Seller)</p>
                <p className="text-[#e8e8f0] mt-0.5">{e.payee?.username || '—'}</p>
              </div>
            </div>

            <div className="text-xs text-[#4a4a6a] space-y-1">
              <p>Funded: <span className="text-[#7b7b9a]">{e.fundedAt ? new Date(e.fundedAt).toLocaleString() : '—'}</span></p>
              <p>Raised: <span className="text-[#7b7b9a]">{dispute.createdAt ? new Date(dispute.createdAt).toLocaleString() : '—'}</span> by <span className="text-[#7b7b9a]">{dispute.raisedBy?.username || '—'}</span></p>
              {e.ticket?.id && <p>Ticket: <span className="text-[#4f8ef7] az-mono">{e.ticket.name || e.ticket.id}</span></p>}
            </div>

            {/* Dispute reason */}
            <div className="bg-[#0f0f17] border border-[#1e1e2e] rounded-xl p-3">
              <p className="text-xs text-[#4a4a6a] mb-1">Dispute reason</p>
              <p className="text-sm text-[#e8e8f0]">{dispute.reason || '—'}</p>
            </div>

            {isResolved ? (
              <div className="bg-[#00d97e10] border border-[#00d97e30] rounded-xl p-3 space-y-1">
                <p className="text-xs text-[#00d97e] font-semibold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Resolved — {dispute.ruling}</p>
                {dispute.ruling === 'SPLIT' && <p className="text-xs text-[#7b7b9a]">Payer {num(dispute.payerPct)}% · Payee {num(dispute.payeePct)}%</p>}
                {dispute.rulingNotes && <p className="text-xs text-[#7b7b9a]">{dispute.rulingNotes}</p>}
              </div>
            ) : (<>
              {/* Ruling selector */}
              <div>
                <p className="text-xs font-semibold text-[#4a4a6a] uppercase tracking-wider mb-2 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Ruling</p>
                <div className="grid grid-cols-3 gap-2">
                  {RULINGS.map((r) => (
                    <button key={r.value} onClick={() => setRuling(r.value)}
                            className={`text-left p-3 rounded-xl border transition-all ${ruling === r.value ? `${r.active} ${r.color}` : 'border-[#1e1e2e] text-[#4a4a6a] hover:border-[#2a2a3e] hover:text-[#7b7b9a]'}`}>
                      <p className="text-xs font-semibold">{r.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-80">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Split inputs + preview */}
              {ruling === 'SPLIT' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#7b7b9a] block mb-1">Payer %</label>
                      <Input type="number" min={0} max={100} value={payerPct}
                             onChange={(ev) => setPayerPct(Math.min(100, Math.max(0, parseInt(ev.target.value, 10) || 0)))}
                             className="bg-[#0a0a0f] border-[#2a2a3e] text-[#e8e8f0] az-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-[#7b7b9a] block mb-1">Payee %</label>
                      <Input type="number" value={payeePct} readOnly
                             className="bg-[#0a0a0f] border-[#2a2a3e] text-[#7b7b9a] az-mono" />
                    </div>
                  </div>
                  <div className="flex rounded-lg overflow-hidden h-2">
                    <div className="bg-[#4f8ef7] transition-all" style={{ width: `${Math.min(100, Math.max(0, parseInt(payerPct, 10) || 0))}%` }} />
                    <div className="flex-1 bg-[#00d97e]" />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#4f8ef7]">Payer gets {usdc(amount * ((parseInt(payerPct, 10) || 0) / 100))}</span>
                    <span className="text-[#00d97e]">Payee gets {usdc(amount * (payeePct / 100))}</span>
                  </div>
                  {(parseInt(payerPct, 10) < 5 || parseInt(payerPct, 10) > 95) && (
                    <div className="flex items-center gap-2 bg-[#f59e0b15] border border-[#f59e0b40] rounded-xl px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" />
                      <span className="text-xs text-[#f59e0b]">Extreme ruling — will require confirmation</span>
                    </div>
                  )}
                </div>
              )}

              <Textarea value={notes} onChange={(ev) => setNotes(ev.target.value)}
                        placeholder="Ruling notes (recorded in audit log)..."
                        className="bg-[#0a0a0f] border-[#2a2a3e] text-[#e8e8f0] text-xs resize-none placeholder:text-[#4a4a6a]" rows={2} />

              <Button onClick={() => submit(false)} disabled={!ruling || !notes.trim() || resolveMutation.isPending}
                      className="w-full bg-[#00d97e] hover:bg-[#00bf6f] text-[#0a0a0f] font-semibold text-sm disabled:opacity-40">
                <DollarSign className="w-3.5 h-3.5 mr-2" />
                {resolveMutation.isPending ? 'Issuing…' : 'Issue Ruling'}
              </Button>
            </>)}
          </div>
        )}
      </div>
    </>
  );
}

export default function EscrowDisputes() {
  const { data, isLoading } = useQuery({
    queryKey: ['escrow-disputes'],
    queryFn: () => escrowApi.disputes(),
    refetchInterval: 30_000,
  });
  const disputes = data?.disputes || [];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const disputedCount = disputes.filter((d) => d.escrow?.status === 'DISPUTED').length;
  const adminReviewCount = disputes.filter((d) => d.escrow?.status === 'ADMIN_REVIEW').length;
  const resolvedToday = disputes.filter((d) => d.status === 'RESOLVED' && d.resolvedAt && new Date(d.resolvedAt) >= today).length;
  const totalValue = disputes.reduce((sum, d) => sum + num(d.escrow?.amountUsdc), 0);
  const openDisputes = disputes.filter((d) => d.status !== 'RESOLVED');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[#f43f5e22] rounded-xl flex items-center justify-center az-glow-red">
          <Lock className="w-4 h-4 text-[#f43f5e]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#e8e8f0]">Escrow Dispute Queue</h1>
          <p className="text-xs text-[#4a4a6a]"><span className="text-[#f43f5e] font-semibold">{openDisputes.length}</span> open disputes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? Array(4).fill(0).map((_, i) => <div key={i} className="az-card h-24 az-shimmer" />) : (<>
          <StatCard label="Disputed" value={disputedCount} icon={ShieldAlert} color="red" />
          <StatCard label="Admin Review" value={adminReviewCount} icon={Scale} color="amber" />
          <StatCard label="Resolved Today" value={resolvedToday} icon={CheckCircle} color="emerald" />
          <StatCard label="Total Escrow Value" value={usdc(totalValue)} icon={DollarSign} color="blue" />
        </>)}
      </div>

      {/* List */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[#4a4a6a] uppercase tracking-widest">Disputes</h2>
        {isLoading && <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="az-card h-20 az-shimmer" />)}</div>}
        {disputes.map((d) => <EscrowDisputeCard key={d.id} dispute={d} />)}
        {!isLoading && disputes.length === 0 && (
          <div className="text-center py-12 az-card">
            <div className="w-10 h-10 bg-[#00d97e22] rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-[#00d97e]" />
            </div>
            <p className="text-sm font-medium text-[#7b7b9a]">No escrow disputes</p>
            <p className="text-xs text-[#4a4a6a] mt-1">All escrows are healthy ✓</p>
          </div>
        )}
      </div>
    </div>
  );
}
