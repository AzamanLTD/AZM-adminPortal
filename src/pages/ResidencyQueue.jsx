import { useState } from 'react';
import { usePoRQueue, usePoRApprove, usePoRReject } from '@/lib/useAdminData';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Home, RefreshCw, CheckCircle, XCircle, FileText, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function isPdf(url = '') {
  return url.toLowerCase().includes('.pdf');
}

function RejectDialog({ submission, open, onOpenChange }) {
  const [reason, setReason] = useState('');
  const reject = usePoRReject();

  function submit() {
    reject.mutate({ userId: submission.id, reason }, {
      onSuccess: () => { toast.success('Residency rejected'); onOpenChange(false); setReason(''); },
      onError: (e) => toast.error(e.message || 'Reject failed'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-az-surface border-az-border text-az-text-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" /> Reject Residency
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-az-text-secondary">Rejecting @{submission?.username}'s residency document.</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Reason for rejection (1–500 chars, shown to the user)…"
            className="bg-az-card border-az-border text-white text-sm resize-none" />
          <p className="text-[11px] text-az-text-muted">{reason.trim().length}/500</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-az-text-secondary">Cancel</Button>
          <Button onClick={submit} disabled={!reason.trim() || reason.trim().length > 500 || reject.isPending}
            className="bg-red-600 hover:bg-red-500">Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ submission, open, onOpenChange }) {
  const url = submission?.proofOfResidencyUrl;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-az-surface border-az-border text-az-text-primary max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> {submission?.username} — Residency Document
          </DialogTitle>
        </DialogHeader>
        <div className="bg-az-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
          {!url ? (
            <p className="text-az-text-muted text-sm py-10">No document URL on file</p>
          ) : isPdf(url) ? (
            <iframe title="residency" src={url} className="w-full h-[60vh]" />
          ) : (
            <img src={url} alt="residency document" className="max-h-[60vh] w-auto object-contain" />
          )}
        </div>
        <a href={url} target="_blank" rel="noreferrer"
          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 justify-center">
          Open in new tab <ExternalLink className="w-3 h-3" />
        </a>
      </DialogContent>
    </Dialog>
  );
}

export default function ResidencyQueue() {
  const { data: queue = [], isLoading, refetch } = usePoRQueue();
  const approve = usePoRApprove();
  const [rejectTarget, setRejectTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Proof of Residency Queue</h1>
            <p className="text-sm text-az-text-secondary">{queue.length} awaiting review</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-az-border text-az-text-secondary hover:bg-az-card">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-az-text-muted text-sm">Loading…</p>}
        {queue.map((s) => (
          <div key={s.id} className="bg-az-surface border border-az-border rounded-xl p-4 flex items-center gap-4">
            <button onClick={() => setPreviewTarget(s)}
              className="w-16 h-16 rounded-lg bg-az-black border border-az-border flex items-center justify-center flex-shrink-0 overflow-hidden hover:border-emerald-500/50 transition-colors">
              {s.proofOfResidencyUrl && !isPdf(s.proofOfResidencyUrl)
                ? <img src={s.proofOfResidencyUrl} alt="" className="w-full h-full object-cover" />
                : <FileText className="w-6 h-6 text-az-text-muted" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">@{s.username}</span>
                <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">PENDING REVIEW</Badge>
              </div>
              <p className="text-xs text-az-text-muted mt-0.5">{s.email}</p>
              <p className="text-[11px] text-az-text-muted mt-1">Submitted {fmtDateTime(s.proofOfResidencySubmittedAt)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setPreviewTarget(s)}
                className="border-az-border text-az-text-secondary hover:bg-az-card h-8">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> View
              </Button>
              <Button size="sm" onClick={() => approve.mutate(s.id, { onSuccess: () => toast.success('Residency approved') })}
                disabled={approve.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-8">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectTarget(s)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8">
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && queue.length === 0 && (
          <div className="text-center py-12 text-az-text-muted text-sm bg-az-surface border border-az-border rounded-xl">
            No residency documents awaiting review
          </div>
        )}
      </div>

      {previewTarget && (
        <PreviewDialog submission={previewTarget} open={!!previewTarget} onOpenChange={(o) => !o && setPreviewTarget(null)} />
      )}
      {rejectTarget && (
        <RejectDialog submission={rejectTarget} open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)} />
      )}
    </div>
  );
}
