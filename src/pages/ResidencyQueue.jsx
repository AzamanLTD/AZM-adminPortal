import { useState } from 'react';
import { usePoRQueue, usePoRApprove, usePoRReject } from '@/lib/useAdminData';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/forge';
import { Button } from '@/components/forge';
import { Badge } from '@/components/forge';
import { Textarea } from '@/components/forge';
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
      <DialogContent className="bg-[var(--f-surface-raised)] border-line text-ink-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-[var(--f-bad)]" /> Reject Residency
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-ink-2">Rejecting @{submission?.username}'s residency document.</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Reason for rejection (1–500 chars, shown to the user)…"
            className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-sm resize-none" />
          <p className="text-[11px] text-ink-3">{reason.trim().length}/500</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-ink-2">Cancel</Button>
          <Button onClick={submit} disabled={!reason.trim() || reason.trim().length > 500 || reject.isPending}
            className="bg-red-600 hover:bg-[var(--f-bad)]">Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ submission, open, onOpenChange }) {
  const url = submission?.proofOfResidencyUrl;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--f-surface-raised)] border-line text-ink-primary max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--f-ok)]" /> {submission?.username} — Residency Document
          </DialogTitle>
        </DialogHeader>
        <div className="bg-bg rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
          {!url ? (
            <p className="text-ink-3 text-sm py-10">No document URL on file</p>
          ) : isPdf(url) ? (
            <iframe title="residency" src={url} className="w-full h-[60vh]" />
          ) : (
            <img src={url} alt="residency document" className="max-h-[60vh] w-auto object-contain" />
          )}
        </div>
        <a href={url} target="_blank" rel="noreferrer"
          className="text-xs text-[var(--f-ok)] hover:underline flex items-center gap-1 justify-center">
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
          <div className="w-8 h-8 bg-[var(--f-ok-bg)] rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-[var(--f-ok)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--f-text)]">Proof of Residency Queue</h1>
            <p className="text-sm text-ink-2">{queue.length} awaiting review</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-line text-ink-2 hover:bg-[var(--f-surface-sunken)]">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-ink-3 text-sm">Loading…</p>}
        {queue.map((s) => (
          <div key={s.id} className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-4 flex items-center gap-4">
            <button onClick={() => setPreviewTarget(s)}
              className="w-16 h-16 rounded-lg bg-bg border border-line flex items-center justify-center flex-shrink-0 overflow-hidden hover:border-emerald-500/50 transition-colors">
              {s.proofOfResidencyUrl && !isPdf(s.proofOfResidencyUrl)
                ? <img src={s.proofOfResidencyUrl} alt="" className="w-full h-full object-cover" />
                : <FileText className="w-6 h-6 text-ink-3" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[var(--f-text)]">@{s.username}</span>
                <Tag className="bg-[var(--f-warn-bg)] text-[var(--f-warn)] border-0 text-xs">PENDING REVIEW</Tag>
              </div>
              <p className="text-xs text-ink-3 mt-0.5">{s.email}</p>
              <p className="text-[11px] text-ink-3 mt-1">Submitted {fmtDateTime(s.proofOfResidencySubmittedAt)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setPreviewTarget(s)}
                className="border-line text-ink-2 hover:bg-[var(--f-surface-sunken)] h-8">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> View
              </Button>
              <Button size="sm" onClick={() => approve.mutate(s.id, { onSuccess: () => toast.success('Residency approved') })}
                disabled={approve.isPending}
                className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)] h-8">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectTarget(s)}
                className="border-red-500/50 text-[var(--f-bad)] hover:bg-[var(--f-bad-bg)] h-8">
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && queue.length === 0 && (
          <div className="text-center py-12 text-ink-3 text-sm bg-[var(--f-surface-raised)] border border-line rounded-xl">
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
