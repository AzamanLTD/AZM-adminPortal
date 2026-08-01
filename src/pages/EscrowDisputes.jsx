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
  { value: 'FULL_RELEASE', label: 'Full Release', desc: '100% to Payee (Seller)', color: 'text-[var(--f-ok)]', active: 'border-emerald-500/50 bg-[var(--f-ok-bg)]' },
  { value: 'FULL_REFUND',  label: 'Full Refund',  desc: '100% to Payer (Buyer)',  color: 'text-[var(--f-info)]',    active: 'border-blue-500/50 bg-[var(--f-info-bg)]' },
  { value: 'SPLIT',        label: 'Custom Split',  desc: 'Set custom percentages', color: 'text-[var(--f-warn)]',   active: 'border-amber-500/50 bg-[var(--f-warn-bg)]' },
];

const DISPUTE_STATUS_STYLE = {
  PENDING:      'bg-[var(--f-bad)22] text-[var(--f-bad)] border-[var(--f-bad)40]',
  ASSIGNED:     'bg-[var(--f-warn)22] text-[var(--f-warn)] border-[var(--f-warn)40]',
  UNDER_REVIEW: 'bg-[var(--f-warn)22] text-[var(--f-warn)] border-[var(--f-warn)40]',
  RESOLVED:     'bg-[var(--f-ok)22] text-[var(--f-ok)] border-[var(--f-ok)40]',
};

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function usdc(v) { return `${num(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`; }

// Client-side extreme-ruling confirmation (no server override exists for escrow).
function ExtremeRulingModal({ pending, onConfirm, onCancel }) {
  if (!pending) return null;
  const { payerPct, payeePct } = pending;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 f-scrim" onClick={onCancel} />
      <div className="relative az-card az-glow-amber w-full max-w-md mx-4 p-6 space-y-5 ">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--f-warn)22] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--f-warn)]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--f-warn)]">⚠ Extreme Ruling</h2>
            <p className="text-xs text-[var(--f-text-2)] mt-0.5">This split is outside the normal 5–95% range</p>
          </div>
        </div>
        <div className="bg-[var(--f-surface)] border border-[var(--f-line-strong)] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--f-text-2)]">Payer (Buyer) receives</span>
            <span className="font-bold text-[var(--f-text)] f-mono">{payerPct}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--f-text-2)]">Payee (Seller) receives</span>
            <span className="font-bold text-[var(--f-text)] f-mono">{payeePct}%</span>
          </div>
        </div>
        <p className="text-sm text-[var(--f-text-2)] leading-relaxed">This is an unusual split. Are you absolutely certain?</p>
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" className="flex-1 border border-[var(--f-line-strong)] text-[var(--f-text-2)] hover:text-[var(--f-text)] hover:bg-[var(--f-line)]" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1 border border-[var(--f-bad)] bg-transparent text-[var(--f-bad)] hover:bg-[var(--f-bad)15] font-semibold" onClick={onConfirm}>
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
        <div className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[var(--f-surface)] transition-colors" onClick={() => setExpanded(!expanded)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs f-mono text-[var(--f-text-2)] truncate">#{String(dispute.escrowId).slice(0, 8)}</span>
              <Tag className={`text-xs border font-medium ${DISPUTE_STATUS_STYLE[dispute.status] || 'bg-[var(--f-line)] text-[var(--f-text-2)] border-[var(--f-line-strong)]'}`}>{dispute.status}</Tag>
              <span className="text-sm font-bold text-[var(--f-text)]">{usdc(amount)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--f-text-3)]">
              <span className="text-[var(--f-text-2)]">{e.payer?.username || '—'}</span>
              <ArrowRight className="w-3 h-3" />
              <span className="text-[var(--f-text-2)]">{e.payee?.username || '—'}</span>
            </div>
          </div>
          <span className="text-xs text-[var(--f-text-3)] flex-shrink-0 mt-1">{expanded ? '▲ Collapse' : '▼ Review'}</span>
        </div>

        {expanded && (
          <div className="border-t border-[var(--f-line)] p-4 space-y-4">
            {/* Escrow details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[var(--f-surface)] border border-[var(--f-line)] rounded-xl p-3">
                <p className="text-[var(--f-text-3)]">Amount</p>
                <p className="text-[var(--f-text)] font-bold f-mono mt-0.5">{usdc(amount)}</p>
              </div>
              <div className="bg-[var(--f-surface)] border border-[var(--f-line)] rounded-xl p-3">
                <p className="text-[var(--f-text-3)]">Fee</p>
                <p className="text-[var(--f-text)] font-bold f-mono mt-0.5">{usdc(e.feeUsdc)}</p>
              </div>
              <div className="bg-[var(--f-surface)] border border-[var(--f-line)] rounded-xl p-3">
                <p className="text-[var(--f-text-3)]">Payer (Buyer)</p>
                <p className="text-[var(--f-text)] mt-0.5">{e.payer?.username || '—'}</p>
              </div>
              <div className="bg-[var(--f-surface)] border border-[var(--f-line)] rounded-xl p-3">
                <p className="text-[var(--f-text-3)]">Payee (Seller)</p>
                <p className="text-[var(--f-text)] mt-0.5">{e.payee?.username || '—'}</p>
              </div>
            </div>

            <div className="text-xs text-[var(--f-text-3)] space-y-1">
              <p>Funded: <span className="text-[var(--f-text-2)]">{e.fundedAt ? new Date(e.fundedAt).toLocaleString() : '—'}</span></p>
              <p>Raised: <span className="text-[var(--f-text-2)]">{dispute.createdAt ? new Date(dispute.createdAt).toLocaleString() : '—'}</span> by <span className="text-[var(--f-text-2)]">{dispute.raisedBy?.username || '—'}</span></p>
              {e.ticket?.id && <p>Ticket: <span className="text-[var(--f-info)] f-mono">{e.ticket.name || e.ticket.id}</span></p>}
            </div>

            {/* Dispute reason */}
            <div className="bg-[var(--f-surface)] border border-[var(--f-line)] rounded-xl p-3">
              <p className="text-xs text-[var(--f-text-3)] mb-1">Dispute reason</p>
              <p className="text-sm text-[var(--f-text)]">{dispute.reason || '—'}</p>
            </div>

            {isResolved ? (
              <div className="bg-[var(--f-ok)10] border border-[var(--f-ok)30] rounded-xl p-3 space-y-1">
                <p className="text-xs text-[var(--f-ok)] font-semibold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Resolved — {dispute.ruling}</p>
                {dispute.ruling === 'SPLIT' && <p className="text-xs text-[var(--f-text-2)]">Payer {num(dispute.payerPct)}% · Payee {num(dispute.payeePct)}%</p>}
                {dispute.rulingNotes && <p className="text-xs text-[var(--f-text-2)]">{dispute.rulingNotes}</p>}
              </div>
            ) : (<>
              {/* Ruling selector */}
              <div>
                <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Ruling</p>
                <div className="grid grid-cols-3 gap-2">
                  {RULINGS.map((r) => (
                    <button key={r.value} onClick={() => setRuling(r.value)}
                            className={`text-left p-3 rounded-xl border transition-all ${ruling === r.value ? `${r.active} ${r.color}` : 'border-[var(--f-line)] text-[var(--f-text-3)] hover:border-[var(--f-line-strong)] hover:text-[var(--f-text-2)]'}`}>
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
                      <label className="text-xs text-[var(--f-text-2)] block mb-1">Payer %</label>
                      <Input type="number" min={0} max={100} value={payerPct}
                             onChange={(ev) => setPayerPct(Math.min(100, Math.max(0, parseInt(ev.target.value, 10) || 0)))}
                             className="bg-[var(--f-bg)] border-[var(--f-line-strong)] text-[var(--f-text)] f-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--f-text-2)] block mb-1">Payee %</label>
                      <Input type="number" value={payeePct} readOnly
                             className="bg-[var(--f-bg)] border-[var(--f-line-strong)] text-[var(--f-text-2)] f-mono" />
                    </div>
                  </div>
                  <div className="flex rounded-lg overflow-hidden h-2">
                    <div className="bg-[var(--f-info)] transition-all" style={{ width: `${Math.min(100, Math.max(0, parseInt(payerPct, 10) || 0))}%` }} />
                    <div className="flex-1 bg-[var(--f-ok)]" />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--f-info)]">Payer gets {usdc(amount * ((parseInt(payerPct, 10) || 0) / 100))}</span>
                    <span className="text-[var(--f-ok)]">Payee gets {usdc(amount * (payeePct / 100))}</span>
                  </div>
                  {(parseInt(payerPct, 10) < 5 || parseInt(payerPct, 10) > 95) && (
                    <div className="flex items-center gap-2 bg-[var(--f-warn)15] border border-[var(--f-warn)40] rounded-xl px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--f-warn)] flex-shrink-0" />
                      <span className="text-xs text-[var(--f-warn)]">Extreme ruling — will require confirmation</span>
                    </div>
                  )}
                </div>
              )}

              <Textarea value={notes} onChange={(ev) => setNotes(ev.target.value)}
                        placeholder="Ruling notes (recorded in audit log)..."
                        className="bg-[var(--f-bg)] border-[var(--f-line-strong)] text-[var(--f-text)] text-xs resize-none placeholder:text-[var(--f-text-3)]" rows={2} />

              <Button onClick={() => submit(false)} disabled={!ruling || !notes.trim() || resolveMutation.isPending}
                      className="w-full bg-[var(--f-ok)] hover:bg-[#00bf6f] text-[var(--f-bg)] font-semibold text-sm disabled:opacity-40">
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
    <div className="space-y-6 ">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[var(--f-bad)22] rounded-xl flex items-center justify-center az-glow-red">
          <Lock className="w-4 h-4 text-[var(--f-bad)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--f-text)]">Escrow Dispute Queue</h1>
          <p className="text-xs text-[var(--f-text-3)]"><span className="text-[var(--f-bad)] font-semibold">{openDisputes.length}</span> open disputes</p>
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
        <h2 className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-widest">Disputes</h2>
        {isLoading && <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="az-card h-20 az-shimmer" />)}</div>}
        {disputes.map((d) => <EscrowDisputeCard key={d.id} dispute={d} />)}
        {!isLoading && disputes.length === 0 && (
          <div className="text-center py-12 az-card">
            <div className="w-10 h-10 bg-[var(--f-ok)22] rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-[var(--f-ok)]" />
            </div>
            <p className="text-sm font-medium text-[var(--f-text-2)]">No escrow disputes</p>
            <p className="text-xs text-[var(--f-text-3)] mt-1">All escrows are healthy ✓</p>
          </div>
        )}
      </div>
    </div>
  );
}
