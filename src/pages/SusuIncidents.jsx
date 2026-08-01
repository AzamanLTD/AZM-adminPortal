import { useState } from 'react';
import {
  useSusuIncidents, useAcknowledgeIncident, useResolveSusu,
} from '@/lib/useAdminData';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Siren, RefreshCw, CheckCircle, Snowflake, Play, RotateCcw,
  ShieldAlert, ArrowDownToLine,
} from 'lucide-react';
import { toast } from 'sonner';

const ALERT_META = {
  ADMIN_DEFAULT: { label: 'Admin Default', color: 'bg-[var(--az-red-soft)] text-[var(--f-bad)]', icon: ShieldAlert },
  MASS_DEFAULT_THRESHOLD: { label: 'Mass Default', color: 'bg-[var(--az-red-soft)] text-[var(--f-bad)]', icon: Siren },
  ESCROW_DIVERSION: { label: 'Escrow Diversion', color: 'bg-[var(--az-amber-soft)] text-[var(--f-warn)]', icon: ArrowDownToLine },
  VOUCH_SLASH_TX_FAILURE: { label: 'Slash TX Failure', color: 'bg-orange-500/20 text-orange-400', icon: ShieldAlert },
};

const FILTERS = [
  { key: 'open', label: 'Open', ack: false },
  { key: 'resolved', label: 'Resolved', ack: true },
  { key: 'all', label: 'All', ack: undefined },
];

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function ResolveIncidentDialog({ alert, open, onOpenChange }) {
  const [action, setAction] = useState('REFUND_AND_CLOSE');
  const [notes, setNotes] = useState('');
  const resolve = useResolveSusu();

  function submit() {
    resolve.mutate({ id: alert.susuGroupId, action, notes, alertId: alert.id }, {
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
      <DialogContent className="bg-[var(--az-surface-2)] border-line text-ink-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-[var(--f-bad)]" /> Resolve Incident
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-ink-2">
            {ALERT_META[alert?.alertType]?.label || alert?.alertType} on Susu <span className="font-mono text-xs">{alert?.susuGroupId?.slice(0, 8)}</span>.
            Choose a resolution. This lifts the freeze or refunds and closes the Susu.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('REFUND_AND_CLOSE')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'REFUND_AND_CLOSE' ? 'border-red-500 bg-[var(--az-red-soft)]' : 'border-line hover:border-line-bright'}`}>
              <RotateCcw className="w-4 h-4 text-[var(--f-bad)] mb-1.5" />
              <p className="text-sm font-medium text-[var(--az-text-primary)]">Refund & Close</p>
              <p className="text-[11px] text-ink-3 mt-0.5">Refund the open cycle, cancel the Susu.</p>
            </button>
            <button onClick={() => setAction('RESUME')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'RESUME' ? 'border-emerald-500 bg-[var(--az-emerald-soft)]' : 'border-line hover:border-line-bright'}`}>
              <Play className="w-4 h-4 text-[var(--f-ok)] mb-1.5" />
              <p className="text-sm font-medium text-[var(--az-text-primary)]">Resume</p>
              <p className="text-[11px] text-ink-3 mt-0.5">Lift the freeze, continue cycles.</p>
            </button>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Resolution notes (required)…"
            className="bg-[var(--az-surface-3)] border-line text-[var(--az-text-primary)] text-sm resize-none" />
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

function AlertCard({ alert, onResolve }) {
  const meta = ALERT_META[alert.alertType] || { label: alert.alertType, color: 'bg-line-bright/30 text-ink-2', icon: Siren };
  const Icon = meta.icon;
  const ack = useAcknowledgeIncident();
  const resolved = !!alert.resolution;
  const summary = alert.payload?.summary;

  return (
    <div className={`bg-[var(--az-surface-2)] border rounded-xl p-4 ${resolved ? 'border-line' : 'border-[var(--az-red-glow)]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className={`${meta.color} border-0 text-xs`}>{meta.label}</Tag>
              {resolved
                ? <Tag className="bg-[var(--az-emerald-soft)] text-[var(--f-ok)] border-0 text-xs">{alert.resolution}</Tag>
                : alert.acknowledgedAt
                  ? <Tag className="bg-[var(--az-amber-soft)] text-[var(--f-warn)] border-0 text-xs">ACKNOWLEDGED</Tag>
                  : <Tag className="bg-[var(--az-red-soft)] text-[var(--f-bad)] border-0 text-xs">OPEN</Tag>}
            </div>
            <p className="text-sm text-ink-2 mt-1">{summary || 'Susu incident'}</p>
            <p className="text-[11px] text-ink-3 mt-1">
              Susu <span className="font-mono">{alert.susuGroupId?.slice(0, 8)}</span>
              {alert.cycleId && <> · cycle <span className="font-mono">{String(alert.cycleId).slice(0, 8)}</span></>}
              {' · '}{fmtDateTime(alert.createdAt)}
            </p>
          </div>
        </div>
        {!resolved && (
          <div className="flex gap-2 flex-shrink-0">
            {!alert.acknowledgedAt && (
              <Button size="sm" variant="outline"
                onClick={() => ack.mutate(alert.id, { onSuccess: () => toast.success('Acknowledged') })}
                className="border-line text-ink-2 hover:bg-[var(--az-surface-3)] h-8">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Ack
              </Button>
            )}
            <Button size="sm" onClick={() => onResolve(alert)} className="bg-red-600 hover:bg-[var(--f-bad)] h-8">
              <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Resolve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SusuIncidents() {
  const [filter, setFilter] = useState(FILTERS[0]);
  const { data: alerts = [], isLoading, refetch } = useSusuIncidents(filter.ack);
  const [resolveAlert, setResolveAlert] = useState(null);

  const openCount = alerts.filter((a) => !a.acknowledgedAt && !a.resolution).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--az-red-soft)] rounded-lg flex items-center justify-center">
            <Siren className="w-4 h-4 text-[var(--f-bad)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--az-text-primary)]">War Room — Susu Incidents</h1>
            <p className="text-sm text-ink-2">
              {alerts.length} alerts{filter.key === 'open' && openCount > 0 && <span className="text-[var(--f-bad)]"> · {openCount} need action</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-line text-ink-2 hover:bg-[var(--az-surface-3)]">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filter.key === f.key ? 'border-emerald-500 bg-[var(--az-emerald-soft)] text-[var(--f-ok)]' : 'border-line text-ink-2 hover:border-line-bright'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-ink-3 text-sm">Loading…</p>}
        {alerts.map((a) => <AlertCard key={a.id} alert={a} onResolve={setResolveAlert} />)}
        {!isLoading && alerts.length === 0 && (
          <div className="text-center py-12 text-ink-3 text-sm bg-[var(--az-surface-2)] border border-line rounded-xl">
            {filter.key === 'open' ? 'No open incidents — all clear ✓' : 'No incidents'}
          </div>
        )}
      </div>

      {resolveAlert && (
        <ResolveIncidentDialog alert={resolveAlert} open={!!resolveAlert} onOpenChange={(o) => !o && setResolveAlert(null)} />
      )}
    </div>
  );
}
