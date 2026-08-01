import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, ChevronLeft, ChevronRight, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ACTION_COLORS = {
  SETTINGS_CHANGE: 'bg-[var(--az-blue-soft)] text-[var(--f-info)]',
  FEE_PROFILE_CREATE: 'bg-[var(--az-emerald-soft)] text-[var(--f-ok)]',
  FEE_PROFILE_UPDATE: 'bg-[var(--az-emerald-soft)] text-[var(--f-ok)]',
  FEE_PROFILE_DELETE: 'bg-[var(--az-red-soft)] text-[var(--f-bad)]',
  USER_BAN: 'bg-[var(--az-red-soft)] text-[var(--f-bad)]',
  USER_ROLE_CHANGE: 'bg-[var(--az-violet-soft)] text-[var(--az-violet)]',
  USER_RISK_TIER_CHANGE: 'bg-[var(--az-amber-soft)] text-[var(--f-warn)]',
  KYC_APPROVE: 'bg-[var(--az-emerald-soft)] text-[var(--f-ok)]',
  KYC_REJECT: 'bg-[var(--az-red-soft)] text-[var(--f-bad)]',
  DISPUTE_RESOLVE: 'bg-[var(--az-violet-soft)] text-[var(--az-violet)]',
  FORCE_RELEASE: 'bg-[var(--az-amber-soft)] text-[var(--f-warn)]',
  FORCE_CANCEL: 'bg-[var(--az-red-soft)] text-[var(--f-bad)]',
  WITHDRAWAL_APPROVE: 'bg-[var(--az-emerald-soft)] text-[var(--f-ok)]',
  WITHDRAWAL_REJECT: 'bg-[var(--az-red-soft)] text-[var(--f-bad)]',
  CORPORATE_PURCHASE: 'bg-[var(--az-blue-soft)] text-[var(--f-info)]',
  COLD_STORAGE_TRANSFER: 'bg-az-text-muted/20 text-ink-2',
  PROFIT_LIQUIDATION: 'bg-[var(--az-violet-soft)] text-[var(--az-violet)]',
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
          <h1 className="text-xl font-bold text-[var(--az-text-primary)]">Audit Log</h1>
          <p className="text-sm text-ink-2 mt-1">Complete history of every admin action — fee changes, bans, KYC decisions, dispute resolutions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="border-line text-ink-2 hover:bg-[var(--az-surface-3)]">
            <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-line text-ink-2 hover:bg-[var(--az-surface-3)]">
            <FileText className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
        <Input
          placeholder="Search by action, admin, or note…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 bg-[var(--az-surface-2)] border-line text-[var(--az-text-primary)]"
        />
      </div>

      <div className="bg-[var(--az-surface-2)] border border-line rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 gap-3 px-4 py-2.5 border-b border-line text-xs text-ink-3 uppercase tracking-wide">
          <span>Time</span><span>Action</span><span>Admin</span><span>Details</span><span>Note</span>
        </div>
        {isLoading && <p className="text-ink-3 text-sm text-center py-8">Loading…</p>}
        {isError && (
          <div className="flex flex-col items-center py-8 gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--f-bad)]" />
            <p className="text-sm text-[var(--f-bad)]">Failed to load audit log</p>
            <p className="text-xs text-ink-3">{error?.message || 'Server error'}</p>
          </div>
        )}
        {!isLoading && !isError && entries.map((e) => (
          <div key={e.id} className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-line/50 last:border-0 items-start hover:bg-surface/20 transition-colors">
            <span className="text-xs text-ink-3">{new Date(e.createdAt).toLocaleString()}</span>
            <Tag className={`${ACTION_COLORS[e.action] || 'bg-az-text-muted/20 text-ink-2'} border-0 text-xs w-fit`}>
              {e.action.replace(/_/g, ' ')}
            </Tag>
            <span className="text-xs text-ink-2 truncate">{e.admin}</span>
            <div className="text-xs text-ink-2">
              {e.field && <span>{e.field}: </span>}
              {e.oldValue && <span className="text-[var(--f-bad)]">{e.oldValue}</span>}
              {e.oldValue && e.newValue && <span className="text-ink-3"> → </span>}
              {e.newValue && <span className="text-[var(--f-ok)]">{e.newValue}</span>}
              {e.targetId && <span className="text-ink-3 ml-1">({e.targetId})</span>}
            </div>
            <span className="text-xs text-ink-3 italic">{e.note || '–'}</span>
          </div>
        ))}
        {!isLoading && !isError && entries.length === 0 && (
          <p className="text-ink-3 text-sm text-center py-8">
            {search ? `No entries matching "${search}"` : 'No audit entries yet'}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-3">Showing {entries.length} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-line text-ink-2 h-8">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" disabled={entries.length === 0} onClick={() => setPage(p => p + 1)} className="border-line text-ink-2 h-8">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
