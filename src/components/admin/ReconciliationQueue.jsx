import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, LockKeyhole, RefreshCw, UnlockKeyhole } from 'lucide-react';
import { controlPlaneApi } from '@/lib/controlPlaneApi';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function claimFrom(item) {
  return item?.details?.claim || null;
}

export default function ReconciliationQueue() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('OPEN');
  const [resolvingId, setResolvingId] = useState(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState(null);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['control-plane', 'reconciliation', status, page],
    queryFn: () => controlPlaneApi.reconciliation.list(page, 25, status),
    refetchInterval: 15_000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['control-plane', 'reconciliation'] });
    qc.invalidateQueries({ queryKey: ['control-plane', 'activity'] });
  };
  const claimMutation = useMutation({
    mutationFn: (id) => controlPlaneApi.reconciliation.claim(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: refresh,
  });
  const releaseMutation = useMutation({
    mutationFn: (id) => controlPlaneApi.reconciliation.release(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: refresh,
  });
  const resolveMutation = useMutation({
    mutationFn: /** @param {{ id: string | number, resolutionReason: string }} data */ ({ id, resolutionReason }) => controlPlaneApi.reconciliation.resolve(id, resolutionReason),
    onSuccess: () => {
      setResolvingId(null);
      setReason('');
      refresh();
    },
  });

  const exceptions = query.data?.exceptions || [];
  const hasMore = Boolean(query.data?.pagination?.hasMore);
  const openCount = exceptions.filter((item) => item.status === 'OPEN').length;

  return (
    <section className="rounded-xl p-4" style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--f-bad-bg)', color: 'var(--f-bad)' }}><AlertTriangle className="h-4 w-4" /></div>
          <div>
            <p className="az-section-label">Financial reconciliation</p>
            <p className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>Exceptions that automation refused to resolve by guessing.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-md px-2 py-1.5 text-xs" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text)', border: '1px solid var(--f-line)' }}>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ALL">All</option>
          </select>
          <button onClick={() => query.refetch()} className="f-icon-btn" title="Refresh reconciliation queue"><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {query.isError && <div className="rounded-lg px-3 py-2 text-sm mb-3" style={{ background: 'var(--f-bad-bg)', color: 'var(--f-bad)' }}>Unable to load the reconciliation queue. Your account may not have staff.view permission.</div>}
      {!query.isError && !exceptions.length && <div className="py-8 text-center text-sm" style={{ color: 'var(--f-text-3)' }}>{status === 'OPEN' ? 'No open reconciliation exceptions.' : 'No exceptions found.'}</div>}

      {!!exceptions.length && <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left" style={{ color: 'var(--f-text-3)', borderBottom: '1px solid var(--f-line)' }}>
            <th className="py-2 pr-3 font-medium">Issue</th><th className="py-2 pr-3 font-medium">Entity</th><th className="py-2 pr-3 font-medium">Reference</th><th className="py-2 pr-3 font-medium">Last seen</th><th className="py-2 font-medium">Action</th>
          </tr></thead>
          <tbody>{exceptions.map((item) => {
            const claim = claimFrom(item);
            const claimActive = Boolean(claim?.expiresAt && new Date(claim.expiresAt).getTime() > Date.now());
            const claimLabel = claimActive ? `Claimed • expires ${formatDate(claim.expiresAt)}` : null;
            return <tr key={item.id} style={{ borderBottom: '1px solid var(--f-line)' }}>
              <td className="py-3 pr-3"><div className="font-medium" style={{ color: 'var(--f-text)' }}>{item.reason}</div><div className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>{item.status}</div></td>
              <td className="py-3 pr-3 font-mono text-xs" style={{ color: 'var(--f-text-2)' }}>{item.entityType}:{item.entityId}</td>
              <td className="py-3 pr-3 font-mono text-xs" style={{ color: 'var(--f-text-3)' }}>{item.reference || '—'}</td>
              <td className="py-3 pr-3 whitespace-nowrap text-xs" style={{ color: 'var(--f-text-3)' }}>{formatDate(item.lastSeenAt)}</td>
              <td className="py-3">
                {item.status === 'OPEN' && resolvingId !== item.id && <div className="flex flex-wrap items-center gap-2">
                  {!claimActive && <button disabled={busyId === item.id} onClick={() => claimMutation.mutate(item.id)} className="az-btn-secondary text-xs inline-flex items-center gap-1"><LockKeyhole className="h-3.5 w-3.5" /> {busyId === item.id ? 'Working…' : 'Claim'}</button>}
                  {claimActive && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-2)' }}><LockKeyhole className="h-3.5 w-3.5" /> {claimLabel}</span>}
                  {claimActive && <button disabled={busyId === item.id} onClick={() => releaseMutation.mutate(item.id)} className="az-btn-secondary text-xs inline-flex items-center gap-1"><UnlockKeyhole className="h-3.5 w-3.5" /> Release</button>}
                  <button onClick={() => setResolvingId(item.id)} className="az-btn-primary text-xs">Resolve</button>
                </div>}
                {item.status === 'RESOLVED' && <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--f-good)' }}><CheckCircle2 className="h-3.5 w-3.5" /> {item.resolvedByUsername || item.resolvedByEmail || 'Resolved'}</span>}
                {resolvingId === item.id && <div className="flex items-center gap-2 min-w-[280px]"><input autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Resolution reason" maxLength={500} className="rounded-md px-2 py-1.5 text-xs flex-1" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text)', border: '1px solid var(--f-line)' }} /><button disabled={reason.trim().length < 3 || resolveMutation.isPending} onClick={() => resolveMutation.mutate({ id: item.id, resolutionReason: reason.trim() })} className="az-btn-primary text-xs disabled:opacity-40">{resolveMutation.isPending ? 'Saving…' : 'Confirm'}</button><button disabled={resolveMutation.isPending} onClick={() => { setResolvingId(null); setReason(''); }} className="az-btn-secondary text-xs">Cancel</button></div>}
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>}

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs" style={{ color: 'var(--f-text-3)' }}>{status === 'OPEN' ? `${openCount} shown open` : `${exceptions.length} shown`}</span>
        <div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="az-btn-secondary disabled:opacity-40">Previous</button><span className="text-xs font-mono" style={{ color: 'var(--f-text-3)' }}>Page {page}</span><button disabled={!hasMore} onClick={() => setPage((value) => value + 1)} className="az-btn-secondary disabled:opacity-40">Next</button></div>
      </div>
    </section>
  );
}