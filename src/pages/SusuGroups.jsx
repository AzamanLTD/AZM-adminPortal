import { useState } from 'react';
import { useSusuList, useSusuDetail, useResolveSusu } from '@/lib/useAdminData';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import MemberDetailDialog from '@/components/admin/MemberDetailDialog';
import {
  PiggyBank, RefreshCw, Snowflake, Users, CalendarClock, Eye,
  Play, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES = {
  CONFIGURING: 'bg-[var(--az-blue-soft)] text-[var(--az-blue)]',
  ACTIVE: 'bg-[var(--az-emerald-soft)] text-[var(--az-emerald)]',
  COMPLETED: 'bg-az-border-bright/30 text-az-text-secondary',
  CANCELLED: 'bg-az-border-bright/30 text-az-text-secondary',
  FROZEN_DISPUTE: 'bg-[var(--az-red-soft)] text-[var(--az-red)]',
};
const CYCLE_STYLES = {
  PENDING: 'bg-az-border-bright/30 text-az-text-secondary',
  COLLECTING: 'bg-[var(--az-amber-soft)] text-[var(--az-amber)]',
  COLLECTING_GRACE: 'bg-[var(--az-red-soft)] text-[var(--az-red)]',
  PAID_OUT: 'bg-[var(--az-emerald-soft)] text-[var(--az-emerald)]',
  DEFAULTED: 'bg-[var(--az-red-soft)] text-[var(--az-red)]',
};
const MEMBER_STYLES = {
  PENDING_VOUCH: 'bg-az-border-bright/30 text-az-text-secondary',
  PENDING_CONTRACT: 'bg-[var(--az-amber-soft)] text-[var(--az-amber)]',
  ACTIVE: 'bg-[var(--az-emerald-soft)] text-[var(--az-emerald)]',
  DEFAULTED: 'bg-[var(--az-red-soft)] text-[var(--az-red)]',
  REMOVED: 'bg-az-border-bright/30 text-az-text-muted',
};

const FILTERS = ['ALL', 'ACTIVE', 'CONFIGURING', 'FROZEN_DISPUTE', 'COMPLETED', 'CANCELLED'];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ResolveDialog({ susu, open, onOpenChange }) {
  const [action, setAction] = useState('REFUND_AND_CLOSE');
  const [notes, setNotes] = useState('');
  const resolve = useResolveSusu();

  function submit() {
    resolve.mutate({ id: susu.id, action, notes }, {
      onSuccess: (r) => {
        toast.success(action === 'RESUME'
          ? 'Susu resumed'
          : `Closed & refunded ${r.data?.refundedMembers ?? 0} member(s)`);
        onOpenChange(false);
        setNotes('');
      },
      onError: (e) => toast.error(e.message || 'Resolve failed'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--az-surface-2)] border-az-border text-az-text-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-[var(--az-red)]" /> Resolve Frozen Susu
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-az-text-secondary">
            "{susu?.name}" is frozen ({susu?.frozenReason || 'dispute'}). Choose how to resolve the incident.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('REFUND_AND_CLOSE')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'REFUND_AND_CLOSE' ? 'border-red-500 bg-[var(--az-red-soft)]' : 'border-az-border hover:border-az-border-bright'}`}>
              <RotateCcw className="w-4 h-4 text-[var(--az-red)] mb-1.5" />
              <p className="text-sm font-medium text-[var(--az-text-primary)]">Refund & Close</p>
              <p className="text-[11px] text-az-text-muted mt-0.5">Refund the open cycle's contributions, cancel the Susu.</p>
            </button>
            <button onClick={() => setAction('RESUME')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'RESUME' ? 'border-emerald-500 bg-[var(--az-emerald-soft)]' : 'border-az-border hover:border-az-border-bright'}`}>
              <Play className="w-4 h-4 text-[var(--az-emerald)] mb-1.5" />
              <p className="text-sm font-medium text-[var(--az-text-primary)]">Resume</p>
              <p className="text-[11px] text-az-text-muted mt-0.5">Lift the freeze and let cycles continue.</p>
            </button>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Resolution notes (required, recorded against the incident)…"
            className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)] text-sm resize-none" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-az-text-secondary">Cancel</Button>
          <Button onClick={submit} disabled={!notes.trim() || resolve.isPending}
            className={action === 'RESUME' ? 'bg-emerald-600 hover:bg-[var(--az-emerald)]' : 'bg-red-600 hover:bg-[var(--az-red)]'}>
            {action === 'RESUME' ? 'Resume Susu' : 'Refund & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ susuId, open, onOpenChange, onResolve, onMember }) {
  const { data: susu, isLoading } = useSusuDetail(open ? susuId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--az-surface-2)] border-az-border text-az-text-primary max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-[var(--az-emerald)]" />
            {susu?.groupChat?.name || 'Susu'} detail
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-az-text-muted text-sm py-6 text-center">Loading…</p>}

        {susu && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${STATUS_STYLES[susu.status]} border-0`}>{susu.status}</Badge>
              <span className="text-sm text-az-text-secondary">${Number(susu.contributionUsdc).toFixed(2)} / {susu.frequency.toLowerCase()}</span>
              <span className="text-sm text-az-text-muted">· pool ${Number(susu.projectedPool).toFixed(2)}</span>
              <span className="text-sm text-az-text-muted">· {susu.totalCycles} cycles</span>
            </div>

            {susu.status === 'FROZEN_DISPUTE' && (
              <div className="flex items-center justify-between bg-[var(--az-red-soft)] border border-[var(--az-red-glow)] rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <Snowflake className="w-4 h-4" /> Frozen: {susu.frozenReason} · {fmtDate(susu.frozenAt)}
                </div>
                <Button size="sm" onClick={() => onResolve(susu)} className="bg-red-600 hover:bg-[var(--az-red)] h-8">Resolve</Button>
              </div>
            )}

            {/* Members */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-az-text-secondary uppercase tracking-wide flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Members ({susu.members.length})
              </h4>
              <div className="space-y-1.5">
                {susu.members.map((m) => (
                  <button key={m.susuMemberId} onClick={() => onMember(m.userId)}
                    className="w-full flex items-center justify-between bg-az-card/40 hover:bg-[var(--az-surface-3)] rounded-lg px-3 py-2 text-sm transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className="bg-az-border text-az-text-secondary border-0 text-[10px]">#{m.payoutSlot ?? '—'}</Badge>
                      <span className="text-az-text-primary truncate">{m.displayName}</span>
                      {m.autoRetainNextCycle && <Badge className="bg-[var(--az-blue-soft)] text-[var(--az-blue)] border-0 text-[10px]">auto-retain</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${MEMBER_STYLES[m.status]} border-0 text-[10px]`}>{m.status}</Badge>
                      <Eye className="w-3.5 h-3.5 text-az-text-muted" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cycle schedule */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-az-text-secondary uppercase tracking-wide flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5" /> Cycle Schedule ({susu.cycles.length})
              </h4>
              <div className="bg-az-card/40 rounded-lg overflow-hidden">
                <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-az-border/50 text-[11px] text-az-text-muted uppercase">
                  <span>#</span><span>Date</span><span>Recipient</span><span>Amount</span><span>Status</span>
                </div>
                {susu.cycles.map((c) => (
                  <div key={c.id} className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-az-border/30 last:border-0 text-xs items-center">
                    <span className="text-az-text-secondary">{c.cycleNumber}</span>
                    <span className="text-az-text-secondary">{fmtDate(c.collectionDate)}</span>
                    <span className="text-az-text-secondary">#{c.payoutUserId}</span>
                    <span className="text-az-text-secondary">${Number(c.payoutAmount).toFixed(2)}</span>
                    <span>
                      <Badge className={`${CYCLE_STYLES[c.status]} border-0 text-[10px]`}>
                        {c.status === 'COLLECTING_GRACE' ? 'GRACE 24H' : c.status}
                      </Badge>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Incidents */}
            {susu.warRoomAlerts?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-az-text-secondary uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Incidents ({susu.warRoomAlerts.length})
                </h4>
                <div className="space-y-1.5">
                  {susu.warRoomAlerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-az-card/40 rounded-lg px-3 py-2 text-xs">
                      <span className="text-az-text-secondary">{a.alertType.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        {a.resolution
                          ? <Badge className="bg-[var(--az-emerald-soft)] text-[var(--az-emerald)] border-0 text-[10px]">{a.resolution}</Badge>
                          : a.acknowledgedAt
                            ? <Badge className="bg-[var(--az-amber-soft)] text-[var(--az-amber)] border-0 text-[10px]">ACK</Badge>
                            : <Badge className="bg-[var(--az-red-soft)] text-[var(--az-red)] border-0 text-[10px]">OPEN</Badge>}
                        <span className="text-az-text-muted">{fmtDate(a.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SusuGroups() {
  const [filter, setFilter] = useState('ALL');
  const { data: susus = [], isLoading, refetch } = useSusuList(filter === 'ALL' ? undefined : filter);
  const [detailId, setDetailId] = useState(null);
  const [resolveSusu, setResolveSusu] = useState(null);
  const [memberId, setMemberId] = useState(null);

  const frozenCount = susus.filter((s) => s.frozen).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--az-emerald-soft)] rounded-lg flex items-center justify-center">
            <PiggyBank className="w-4 h-4 text-[var(--az-emerald)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--az-text-primary)]">Susu Groups Monitor</h1>
            <p className="text-sm text-az-text-secondary">
              {susus.length} groups{frozenCount > 0 && <span className="text-[var(--az-red)]"> · {frozenCount} frozen</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-az-border text-az-text-secondary hover:bg-[var(--az-surface-3)]">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filter === f ? 'border-emerald-500 bg-[var(--az-emerald-soft)] text-[var(--az-emerald)]' : 'border-az-border text-az-text-secondary hover:border-az-border-bright'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--az-surface-2)] border border-az-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-az-border text-[11px] text-az-text-muted uppercase">
          <span className="col-span-3">Group</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Contribution</span>
          <span className="col-span-2">Members</span>
          <span className="col-span-2">Next Cycle</span>
          <span className="col-span-1 text-right">View</span>
        </div>
        {isLoading && <p className="text-az-text-muted text-sm text-center py-8">Loading…</p>}
        {susus.map((s) => (
          <div key={s.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-az-border/50 last:border-0 text-sm hover:bg-az-card/30 transition-colors items-center">
            <div className="col-span-3 min-w-0">
              <p className="text-az-text-primary truncate font-medium">{s.name}</p>
              <p className="text-[11px] text-az-text-muted">created {fmtDate(s.createdAt)}</p>
            </div>
            <div className="col-span-2 flex items-center gap-1.5">
              <Badge className={`${STATUS_STYLES[s.status]} border-0 text-xs`}>{s.status === 'FROZEN_DISPUTE' ? 'FROZEN' : s.status}</Badge>
              {s.frozen && <Snowflake className="w-3.5 h-3.5 text-[var(--az-red)]" />}
            </div>
            <div className="col-span-2">
              <span className="text-az-text-secondary">${Number(s.contributionUsdc).toFixed(2)}</span>
              <span className="text-[11px] text-az-text-muted"> /{s.frequency.toLowerCase()}</span>
            </div>
            <div className="col-span-2 text-az-text-secondary">
              {s.activeMembers}/{s.memberCount}
              {s.defaultedMembers > 0 && <span className="text-[var(--az-red)] text-xs"> · {s.defaultedMembers} def</span>}
            </div>
            <div className="col-span-2 text-xs text-az-text-secondary">
              {s.nextCycle
                ? <>#{s.nextCycle.cycleNumber} · {fmtDate(s.nextCycle.collectionDate)}{s.nextCycle.status === 'COLLECTING_GRACE' && <span className="text-[var(--az-red)]"> (grace)</span>}</>
                : '—'}
            </div>
            <div className="col-span-1 flex justify-end gap-1.5">
              {s.frozen && (
                <Button size="sm" variant="ghost" onClick={() => setResolveSusu(s)} className="h-7 px-2 text-[var(--az-red)] hover:bg-[var(--az-red-soft)]">
                  <Snowflake className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDetailId(s.id)} className="h-7 px-2 text-az-text-secondary hover:bg-az-border">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && susus.length === 0 && (
          <p className="text-az-text-muted text-sm text-center py-10">No Susu groups for this filter</p>
        )}
      </div>

      <DetailDialog
        susuId={detailId}
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        onResolve={(s) => { setDetailId(null); setResolveSusu(s); }}
        onMember={(uid) => setMemberId(uid)}
      />
      {resolveSusu && (
        <ResolveDialog susu={resolveSusu} open={!!resolveSusu} onOpenChange={(o) => !o && setResolveSusu(null)} />
      )}
      <MemberDetailDialog userId={memberId} open={!!memberId} onOpenChange={(o) => !o && setMemberId(null)} />
    </div>
  );
}
