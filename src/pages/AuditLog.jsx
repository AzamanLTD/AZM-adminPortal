import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACTION_COLORS = {
  SETTINGS_CHANGE: 'bg-blue-500/20 text-blue-400',
  FEE_PROFILE_CREATE: 'bg-emerald-500/20 text-emerald-400',
  FEE_PROFILE_UPDATE: 'bg-emerald-500/20 text-emerald-400',
  FEE_PROFILE_DELETE: 'bg-red-500/20 text-red-400',
  USER_BAN: 'bg-red-500/20 text-red-400',
  USER_ROLE_CHANGE: 'bg-purple-500/20 text-purple-400',
  USER_RISK_TIER_CHANGE: 'bg-amber-500/20 text-amber-400',
  KYC_APPROVE: 'bg-emerald-500/20 text-emerald-400',
  KYC_REJECT: 'bg-red-500/20 text-red-400',
  DISPUTE_RESOLVE: 'bg-purple-500/20 text-purple-400',
  FORCE_RELEASE: 'bg-amber-500/20 text-amber-400',
  FORCE_CANCEL: 'bg-red-500/20 text-red-400',
  WITHDRAWAL_APPROVE: 'bg-emerald-500/20 text-emerald-400',
  WITHDRAWAL_REJECT: 'bg-red-500/20 text-red-400',
  CORPORATE_PURCHASE: 'bg-blue-500/20 text-blue-400',
  COLD_STORAGE_TRANSFER: 'bg-slate-500/20 text-slate-400',
  PROFIT_LIQUIDATION: 'bg-purple-500/20 text-purple-400',
};

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit-log', page, search],
    queryFn: () => api.auditLog.list(page, { search }),
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;

  const filtered = search
    ? entries.filter((e) => e.action.includes(search.toUpperCase()) || e.admin?.includes(search) || e.note?.includes(search))
    : entries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Audit Log</h1>
        <p className="text-sm text-slate-400 mt-1">Complete history of every admin action — fee changes, bans, KYC decisions, dispute resolutions.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search by action, admin, or note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-white"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 gap-3 px-4 py-2.5 border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
          <span>Time</span><span>Action</span><span>Admin</span><span>Details</span><span>Note</span>
        </div>
        {isLoading && <p className="text-slate-500 text-sm text-center py-8">Loading…</p>}
        {isError && (
          <div className="flex flex-col items-center py-8 gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-400">Failed to load audit log</p>
            <p className="text-xs text-slate-500">{error?.message || 'Server error'}</p>
          </div>
        )}
        {!isLoading && !isError && filtered.map((e) => (
          <div key={e.id} className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-slate-800/50 last:border-0 items-start hover:bg-slate-800/20 transition-colors">
            <span className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</span>
            <Badge className={`${ACTION_COLORS[e.action] || 'bg-slate-500/20 text-slate-400'} border-0 text-xs w-fit`}>
              {e.action.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs text-slate-400 truncate">{e.admin}</span>
            <div className="text-xs text-slate-400">
              {e.field && <span>{e.field}: </span>}
              {e.oldValue && <span className="text-red-400">{e.oldValue}</span>}
              {e.oldValue && e.newValue && <span className="text-slate-600"> → </span>}
              {e.newValue && <span className="text-emerald-400">{e.newValue}</span>}
              {e.targetId && <span className="text-slate-500 ml-1">({e.targetId})</span>}
            </div>
            <span className="text-xs text-slate-500 italic">{e.note || '–'}</span>
          </div>
        ))}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">No matching audit entries</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Showing {filtered.length} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-slate-700 text-slate-300 h-8">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={() => setPage(p => p + 1)} className="border-slate-700 text-slate-300 h-8">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
