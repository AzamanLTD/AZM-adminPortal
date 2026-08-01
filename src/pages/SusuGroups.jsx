import { useState } from 'react';
import { useSusuList, useSusuDetail, useResolveSusu } from '@/lib/useAdminData';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/forge';
import { Button } from '@/components/forge';
import { Textarea } from '@/components/forge';
import MemberDetailDialog from '@/components/admin/MemberDetailDialog';
import {
  PiggyBank, RefreshCw, Snowflake, Users, CalendarClock, Eye,
  Play, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES = {
  CONFIGURING: 'bg-[var(--f-info-bg)] text-[var(--f-info)]',
  ACTIVE: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]',
  COMPLETED: 'bg-line-bright/30 text-ink-2',
  CANCELLED: 'bg-line-bright/30 text-ink-2',
  FROZEN_DISPUTE: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]',
};
const CYCLE_STYLES = {
  PENDING: 'bg-line-bright/30 text-ink-2',
  COLLECTING: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]',
  COLLECTING_GRACE: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]',
  PAID_OUT: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]',
  DEFAULTED: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]',
};
const MEMBER_STYLES = {
  PENDING_VOUCH: 'bg-line-bright/30 text-ink-2',
  PENDING_CONTRACT: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]',
  ACTIVE: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]',
  DEFAULTED: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]',
  REMOVED: 'bg-line-bright/30 text-ink-3',
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
      <DialogContent className="bg-[var(--f-surface-raised)] border-line text-ink-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-[var(--f-bad)]" /> Resolve Frozen Susu
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-ink-2">
            "{susu?.name}" is frozen ({susu?.frozenReason || 'dispute'}). Choose how to resolve the incident.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('REFUND_AND_CLOSE')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'REFUND_AND_CLOSE' ? 'border-red-500 bg-[var(--f-bad-bg)]' : 'border-line hover:border-line-bright'}`}>
              <RotateCcw className="w-4 h-4 text-[var(--f-bad)] mb-1.5" />
              <p className="text-sm font-medium text-[var(--f-text)]">Refund & Close</p>
              <p className="text-[11px] text-ink-3 mt-0.5">Refund the open cycle's contributions, cancel the Susu.</p>
            </button>
            <button onClick={() => setAction('RESUME')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'RESUME' ? 'border-emerald-500 bg-[var(--f-ok-bg)]' : 'border-line hover:border-line-bright'}`}>
              <Play className="w-4 h-4 text-[var(--f-ok)] mb-1.5" />
              <p className="text-sm font-medium text-[var(--f-text)]">Resume</p>
              <p className="text-[11px] text-ink-3 mt-0.5">Lift the freeze and let cycles continue.</p>
            </button>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Resolution notes (required, recorded against the incident)…"
            className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-sm resize-none" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-ink-2">Cancel</Button>
          <Button onClick={submit} disabled={!notes.trim() || resolve.isPending}
            className={action === 'RESUME' ? 'bg-emerald-600 hover:bg-[var(--f-ok)]' : 'bg-red-600 hover:bg-[var(--f-bad)]'}>
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
      <DialogContent className="bg-[var(--f-surface-raised)] border-line text-ink-primary max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-[var(--f-ok)]" />
            {susu?.groupChat?.name || 'Susu'} detail
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-ink-3 text-sm py-6 text-center">Loading…</p>}

        {susu && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className={`${STATUS_STYLES[susu.status]} border-0`}>{susu.status}</Tag>
              <span className="text-sm text-ink-2">${Number(susu.contributionUsdc).toFixed(2)} / {susu.frequency.toLowerCase()}</span>
              <span className="text-sm text-ink-3">· pool ${Number(susu.projectedPool).toFixed(2)}</span>
              <span className="text-sm text-ink-3">· {susu.totalCycles} cycles</span>
            </div>

            {susu.status === 'FROZEN_DISPUTE' && (
              <div className="flex items-center justify-between bg-[var(--f-bad-bg)] border border-[var(--f-bad)] rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <Snowflake className="w-4 h-4" /> Frozen: {susu.frozenReason} · {fmtDate(susu.frozenAt)}
                </div>
                <Button size="sm" onClick={() => onResolve(susu)} className="bg-red-600 hover:bg-[var(--f-bad)] h-8">Resolve</Button>
              </div>
            )}

            {/* Members */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-ink-2 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Members ({susu.members.length})
              </h4>
              <div className="space-y-1.5">
                {susu.members.map((m) => (
                  <button key={m.susuMemberId} onClick={() => onMember(m.userId)}
                    className="w-full flex items-center justify-between bg-surface/40 hover:bg-[var(--f-surface-sunken)] rounded-lg px-3 py-2 text-sm transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="bg-line text-ink-2 border-0 text-[10px]">#{m.payoutSlot ?? '—'}</Tag>
                      <span className="text-ink-primary truncate">{m.displayName}</span>
                      {m.autoRetainNextCycle && <Tag className="bg-[var(--f-info-bg)] text-[var(--f-info)] border-0 text-[10px]">auto-retain</Tag>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Tag className={`${MEMBER_STYLES[m.status]} border-0 text-[10px]`}>{m.status}</Tag>
                      <Eye className="w-3.5 h-3.5 text-ink-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cycle schedule */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-ink-2 uppercase tracking-wide flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5" /> Cycle Schedule ({susu.cycles.length})
              </h4>
              <div className="bg-surface/40 rounded-lg overflow-hidden">
                <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-line/50 text-[11px] text-ink-3 uppercase">
                  <span>#</span><span>Date</span><span>Recipient</span><span>Amount</span><span>Status</span>
                </div>
                {susu.cycles.map((c) => (
                  <div key={c.id} className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-line/30 last:border-0 text-xs items-center">
                    <span className="text-ink-2">{c.cycleNumber}</span>
                    <span className="text-ink-2">{fmtDate(c.collectionDate)}</span>
                    <span className="text-ink-2">#{c.payoutUserId}</span>
                    <span className="text-ink-2">${Number(c.payoutAmount).toFixed(2)}</span>
                    <span>
                      <Tag className={`${CYCLE_STYLES[c.status]} border-0 text-[10px]`}>
                        {c.status === 'COLLECTING_GRACE' ? 'GRACE 24H' : c.status}
                      </Tag>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Incidents */}
            {susu.warRoomAlerts?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-ink-2 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Incidents ({susu.warRoomAlerts.length})
                </h4>
                <div className="space-y-1.5">
                  {susu.warRoomAlerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-surface/40 rounded-lg px-3 py-2 text-xs">
                      <span className="text-ink-2">{a.alertType.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        {a.resolution
                          ? <Tag className="bg-[var(--f-ok-bg)] text-[var(--f-ok)] border-0 text-[10px]">{a.resolution}</Tag>
                          : a.acknowledgedAt
                            ? <Tag className="bg-[var(--f-warn-bg)] text-[var(--f-warn)] border-0 text-[10px]">ACK</Tag>
                            : <Tag className="bg-[var(--f-bad-bg)] text-[var(--f-bad)] border-0 text-[10px]">OPEN</Tag>}
                        <span className="text-ink-3">{fmtDate(a.createdAt)}</span>
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
          <div className="w-8 h-8 bg-[var(--f-ok-bg)] rounded-lg flex items-center justify-center">
            <PiggyBank className="w-4 h-4 text-[var(--f-ok)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--f-text)]">Susu Groups Monitor</h1>
            <p className="text-sm text-ink-2">
              {susus.length} groups{frozenCount > 0 && <span className="text-[var(--f-bad)]"> · {frozenCount} frozen</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-line text-ink-2 hover:bg-[var(--f-surface-sunken)]">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filter === f ? 'border-emerald-500 bg-[var(--f-ok-bg)] text-[var(--f-ok)]' : 'border-line text-ink-2 hover:border-line-bright'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-line text-[11px] text-ink-3 uppercase">
          <span className="col-span-3">Group</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Contribution</span>
          <span className="col-span-2">Members</span>
          <span className="col-span-2">Next Cycle</span>
          <span className="col-span-1 text-right">View</span>
        </div>
        {isLoading && <p className="text-ink-3 text-sm text-center py-8">Loading…</p>}
        {susus.map((s) => (
          <div key={s.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-line/50 last:border-0 text-sm hover:bg-surface/30 transition-colors items-center">
            <div className="col-span-3 min-w-0">
              <p className="text-ink-primary truncate font-medium">{s.name}</p>
              <p className="text-[11px] text-ink-3">created {fmtDate(s.createdAt)}</p>
            </div>
            <div className="col-span-2 flex items-center gap-1.5">
              <Tag className={`${STATUS_STYLES[s.status]} border-0 text-xs`}>{s.status === 'FROZEN_DISPUTE' ? 'FROZEN' : s.status}</Tag>
              {s.frozen && <Snowflake className="w-3.5 h-3.5 text-[var(--f-bad)]" />}
            </div>
            <div className="col-span-2">
              <span className="text-ink-2">${Number(s.contributionUsdc).toFixed(2)}</span>
              <span className="text-[11px] text-ink-3"> /{s.frequency.toLowerCase()}</span>
            </div>
            <div className="col-span-2 text-ink-2">
              {s.activeMembers}/{s.memberCount}
              {s.defaultedMembers > 0 && <span className="text-[var(--f-bad)] text-xs"> · {s.defaultedMembers} def</span>}
            </div>
            <div className="col-span-2 text-xs text-ink-2">
              {s.nextCycle
                ? <>#{s.nextCycle.cycleNumber} · {fmtDate(s.nextCycle.collectionDate)}{s.nextCycle.status === 'COLLECTING_GRACE' && <span className="text-[var(--f-bad)]"> (grace)</span>}</>
                : '—'}
            </div>
            <div className="col-span-1 flex justify-end gap-1.5">
              {s.frozen && (
                <Button size="sm" variant="ghost" onClick={() => setResolveSusu(s)} className="h-7 px-2 text-[var(--f-bad)] hover:bg-[var(--f-bad-bg)]">
                  <Snowflake className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDetailId(s.id)} className="h-7 px-2 text-ink-2 hover:bg-line">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && susus.length === 0 && (
          <p className="text-ink-3 text-sm text-center py-10">No Susu groups for this filter</p>
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
