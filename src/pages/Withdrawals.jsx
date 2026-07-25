import { useState } from 'react';
import { useWithdrawals } from '@/lib/useAdminData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useStats } from '@/lib/useAdminData';
import ActionDialog from '@/components/ActionDialog';

const TYPE_COLORS = { FIAT: 'bg-blue-500/20 text-blue-400', CRYPTO: 'bg-purple-500/20 text-purple-400' };

export default function Withdrawals() {
  const { data: withdrawals = [], isLoading, refetch } = useWithdrawals();
  const { data: stats = {} } = useStats();
  const rate = stats.ghsRate || 12.5;
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState(null);

  const approve = useMutation({
    mutationFn: (id) => api.withdrawals.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] }); toast.success('Withdrawal approved'); },
    onError: (e) => toast.error(e.message || 'Failed to approve withdrawal'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }) => api.withdrawals.reject(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] }); toast.success('Withdrawal rejected'); setRejectTarget(null); },
    onError: (e) => toast.error(e.message || 'Failed to reject withdrawal'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pending Withdrawals</h1>
          <p className="text-sm text-slate-400 mt-1">{withdrawals.length} awaiting approval</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-slate-500 text-sm">Loading…</p>}
        {withdrawals.map((w) => (
          <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">{w.userName}</span>
                <Badge className={`${TYPE_COLORS[w.type] || 'bg-slate-500/20 text-slate-400'} border-0 text-xs`}>{w.type}</Badge>
                <span className="text-sm font-bold text-emerald-400">${w.amount} {w.currency}</span>
                {w.type === 'FIAT' && <span className="text-xs text-slate-400">GHS {(w.amount * rate).toFixed(0)}</span>}
              </div>
              <div className="flex gap-3 mt-1 text-xs text-slate-500">
                <span>{w.method || w.wallet}</span>
                <span>Requested: {new Date(w.requestedAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={() => approve.mutate(w.id)}
                disabled={approve.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectTarget(w)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && withdrawals.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-xl">
            No pending withdrawals — all clear
          </div>
        )}
      </div>

      <ActionDialog
        open={!!rejectTarget}
        title="Reject Withdrawal"
        label="Reason for rejection"
        placeholder="Enter rejection reason…"
        confirmLabel="Reject"
        variant="destructive"
        isPending={reject.isPending}
        inputType="textarea"
        onConfirm={(reason) => reject.mutate({ id: rejectTarget.id, reason })}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
