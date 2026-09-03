import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useSystemHealth } from '@/lib/useAdminData';

/**
 * Surfaces degraded platform health at shell level so an operator does not
 * have to discover a system problem by opening the dashboard.
 * Healthy state stays silent to preserve attention for actionable work.
 */
export default function SystemStatusRail() {
  const { data, isLoading, isError, refetch } = useSystemHealth();

  if (isLoading) return null;

  const healthy = data?.status === 'ok' || data?.healthy === true;
  if (healthy && !isError) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-4 mb-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
      style={{
        background: 'var(--f-bad-bg)',
        border: '1px solid rgba(225,83,97,.22)',
        color: 'var(--f-text)',
      }}
    >
      {isError ? (
        <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--f-bad)' }} />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--f-warn)' }} />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          {isError ? 'System health is unavailable' : 'System issue detected'}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--f-text-3)' }}>
          {isError ? 'The health service could not be reached. Verify before taking sensitive action.' : 'Some platform components may require operator attention.'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => refetch()}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold"
        style={{ background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)', color: 'var(--f-text)' }}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Recheck
      </button>
    </div>
  );
}
