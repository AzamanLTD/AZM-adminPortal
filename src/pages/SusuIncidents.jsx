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
  ADMIN_DEFAULT: { label: 'Admin Default', color: 'bg-red-500/20 text-red-400', icon: ShieldAlert },
  MASS_DEFAULT_THRESHOLD: { label: 'Mass Default', color: 'bg-red-500/20 text-red-400', icon: Siren },
  ESCROW_DIVERSION: { label: 'Escrow Diversion', color: 'bg-amber-500/20 text-amber-400', icon: ArrowDownToLine },
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
      <DialogContent className="bg-az-surface border-az-border text-az-text-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-red-400" /> Resolve Incident
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-az-text-secondary">
            {ALERT_META[alert?.alertType]?.label || alert?.alertType} on Susu <span className="font-mono text-xs">{alert?.susuGroupId?.slice(0, 8)}</span>.
            Choose a resolution. This lifts the freeze or refunds and closes the Susu.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAction('REFUND_AND_CLOSE')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'REFUND_AND_CLOSE' ? 'border-red-500 bg-red-500/10' : 'border-az-border hover:border-az-border-bright'}`}>
              <RotateCcw className="w-4 h-4 text-red-400 mb-1.5" />
              <p className="text-sm font-medium text-white">Refund & Close</p>
              <p className="text-[11px] text-az-text-muted mt-0.5">Refund the open cycle, cancel the Susu.</p>
            </button>
            <button onClick={() => setAction('RESUME')}
              className={`p-3 rounded-lg border text-left transition-colors ${action === 'RESUME' ? 'border-emerald-500 bg-emerald-500/10' : 'border-az-border hover:border-az-border-bright'}`}>
              <Play className="w-4 h-4 text-emerald-400 mb-1.5" />
              <p className="text-sm font-medium text-white">Resume</p>
              <p className="text-[11px] text-az-text-muted mt-0.5">Lift the freeze, continue cycles.</p>
            </button>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Resolution notes (required)…"
            className="bg-az-card border-az-border text-white text-sm resize-none" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-az-text-secondary">Cancel</Button>
          <Button onClick={submit} disabled={!notes.trim() || resolve.isPending}
            className={action === 'RESUME' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}>
            {action === 'RESUME' ? 'Resume Susu' : 'Refund & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AlertCard({ alert, onResolve }) {
  const meta = ALERT_META[alert.alertType] || { label: alert.alertType, color: 'bg-az-border-bright/30 text-az-text-secondary', icon: Siren };
  const Icon = meta.icon;
  const ack = useAcknowledgeIncident();
  const resolved = !!alert.resolution;
  const summary = alert.payload?.summary;

  return (
    <div className={`bg-az-surface border rounded-xl p-4 ${resolved ? 'border-az-border' : 'border-red-500/30'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${meta.color} border-0 text-xs`}>{meta.label}</Badge>
              {resolved
                ? <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">{alert.resolution}</Badge>
                : alert.acknowledgedAt
                  ? <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">ACKNOWLEDGED</Badge>
                  : <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">OPEN</Badge>}
            </div>
            <p className="text-sm text-az-text-secondary mt-1">{summary || 'Susu incident'}</p>
            <p className="text-[11px] text-az-text-muted mt-1">
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
                className="border-az-border text-az-text-secondary hover:bg-az-card h-8">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Ack
              </Button>
            )}
            <Button size="sm" onClick={() => onResolve(alert)} className="bg-red-600 hover:bg-red-500 h-8">
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
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
            <Siren className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">War Room — Susu Incidents</h1>
            <p className="text-sm text-az-text-secondary">
              {alerts.length} alerts{filter.key === 'open' && openCount > 0 && <span className="text-red-400"> · {openCount} need action</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-az-border text-az-text-secondary hover:bg-az-card">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filter.key === f.key ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-az-border text-az-text-secondary hover:border-az-border-bright'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-az-text-muted text-sm">Loading…</p>}
        {alerts.map((a) => <AlertCard key={a.id} alert={a} onResolve={setResolveAlert} />)}
        {!isLoading && alerts.length === 0 && (
          <div className="text-center py-12 text-az-text-muted text-sm bg-az-surface border border-az-border rounded-xl">
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
