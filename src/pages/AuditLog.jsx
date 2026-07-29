import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, ChevronLeft, ChevronRight, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  COLD_STORAGE_TRANSFER: 'bg-az-text-muted/20 text-az-text-secondary',
  PROFIT_LIQUIDATION: 'bg-purple-500/20 text-purple-400',
};

function escapeCsvValue(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(entries) {
  const headers = ['Time', 'Action', 'Admin', 'Field', 'Old Value', 'New Value', 'Target ID', 'Note'];
  const rows = entries.map(e => [
    new Date(e.createdAt).toISOString(),
    e.action,
    e.admin,
    e.field || '',
    e.oldValue || '',
    e.newValue || '',
    e.targetId || '',
    e.note || '',
  ].map(escapeCsvValue).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${entries.length} entries to CSV`);
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-log', page, search],
    queryFn: () => api.auditLog.list(page, { search }),
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;

  const handleExport = () => {
    if (entries.length === 0) {
      toast.error('No entries to export');
      return;
    }
    downloadCsv(entries);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-az-text-secondary mt-1">Complete history of every admin action — fee changes, bans, KYC decisions, dispute resolutions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="border-az-border text-az-text-secondary hover:bg-az-card">
            <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-az-border text-az-text-secondary hover:bg-az-card">
            <FileText className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-az-text-muted" />
        <Input
          placeholder="Search by action, admin, or note…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 bg-az-surface border-az-border text-white"
        />
      </div>

      <div className="bg-az-surface border border-az-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 gap-3 px-4 py-2.5 border-b border-az-border text-xs text-az-text-muted uppercase tracking-wide">
          <span>Time</span><span>Action</span><span>Admin</span><span>Details</span><span>Note</span>
        </div>
        {isLoading && <p className="text-az-text-muted text-sm text-center py-8">Loading…</p>}
        {isError && (
          <div className="flex flex-col items-center py-8 gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-400">Failed to load audit log</p>
            <p className="text-xs text-az-text-muted">{error?.message || 'Server error'}</p>
          </div>
        )}
        {!isLoading && !isError && entries.map((e) => (
          <div key={e.id} className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-az-border/50 last:border-0 items-start hover:bg-az-card/20 transition-colors">
            <span className="text-xs text-az-text-muted">{new Date(e.createdAt).toLocaleString()}</span>
            <Badge className={`${ACTION_COLORS[e.action] || 'bg-az-text-muted/20 text-az-text-secondary'} border-0 text-xs w-fit`}>
              {e.action.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs text-az-text-secondary truncate">{e.admin}</span>
            <div className="text-xs text-az-text-secondary">
              {e.field && <span>{e.field}: </span>}
              {e.oldValue && <span className="text-red-400">{e.oldValue}</span>}
              {e.oldValue && e.newValue && <span className="text-az-text-muted"> → </span>}
              {e.newValue && <span className="text-emerald-400">{e.newValue}</span>}
              {e.targetId && <span className="text-az-text-muted ml-1">({e.targetId})</span>}
            </div>
            <span className="text-xs text-az-text-muted italic">{e.note || '–'}</span>
          </div>
        ))}
        {!isLoading && !isError && entries.length === 0 && (
          <p className="text-az-text-muted text-sm text-center py-8">
            {search ? `No entries matching "${search}"` : 'No audit entries yet'}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-az-text-muted">Showing {entries.length} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-az-border text-az-text-secondary h-8">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" disabled={entries.length === 0} onClick={() => setPage(p => p + 1)} className="border-az-border text-az-text-secondary h-8">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
