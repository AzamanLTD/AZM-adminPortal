import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businesses as bizApi } from '@/lib/api';
import StatCard from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Ban, CheckCircle2, Search, FileCheck, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';

const KYB_COLORS = {
  VERIFIED:   'bg-emerald-500/20 text-emerald-400',
  PENDING:    'bg-amber-500/20 text-amber-400',
  REJECTED:   'bg-red-500/20 text-red-400',
  UNVERIFIED: 'bg-az-text-muted/20 text-az-text-secondary',
};

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function BusinessDetailDialog({ bizId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-business-detail', bizId],
    queryFn: () => bizApi.detail(bizId),
    enabled: !!bizId,
  });
  const biz = data?.business;

  return (
    <Dialog open={!!bizId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg bg-[#13131e] border-[#2a2a3e] text-[#e8e8f0]">
        <DialogHeader>
          <DialogTitle className="text-[#e8e8f0]">Business Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-[#7b7b9a] py-6 text-center">Loading…</p>
        ) : !biz ? (
          <p className="text-sm text-[#4a4a6a] py-6 text-center">Business not found</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {biz.logoUrl
                ? <img src={biz.logoUrl} alt={biz.businessName} className="w-12 h-12 rounded-xl object-cover" />
                : <div className="w-12 h-12 rounded-xl bg-[#1e1e2e] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#4a4a6a]" /></div>}
              <div>
                <p className="font-bold text-[#e8e8f0]">{biz.businessName}</p>
                <p className="text-xs text-[#4a4a6a] az-mono">{biz.bizId}</p>
              </div>
            </div>
            {biz.description && <p className="text-xs text-[#7b7b9a]">{biz.description}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Category', biz.category],
                ['KYB Status', biz.kybStatus],
                ['Owner', biz.user?.username],
                ['Country', biz.country || '—'],
                ['Total Escrows', num(biz.totalEscrows)],
                ['Completed', num(biz.completedEscrows)],
                ['Total Volume', `${num(biz.totalVolume).toLocaleString()} USDC`],
                ['Rating', num(biz.averageRating).toFixed(2)],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#0f0f17] border border-[#1e1e2e] rounded-lg p-2.5">
                  <p className="text-[#4a4a6a]">{k}</p>
                  <p className="text-[#e8e8f0] mt-0.5 truncate">{v}</p>
                </div>
              ))}
            </div>
            {biz.website && <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline block">{biz.website}</a>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Businesses() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [kybFilter, setKybFilter] = useState('');
  const [detailBizId, setDetailBizId] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Debounce the search box (400ms) so each keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-businesses', page, search, kybFilter],
    queryFn: () => bizApi.list(page, search, kybFilter),
    placeholderData: (prev) => prev,
  });
  const list = data?.businesses || [];
  const total = data?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  const suspendMutation = useMutation({
    mutationFn: ({ bizId, reason }) => bizApi.suspend(bizId, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-businesses'] }); toast.success('Business suspended'); setSuspendTarget(null); setSuspendReason(''); },
    onError: (e) => toast.error(e.message || 'Suspend failed'),
  });
  const unsuspendMutation = useMutation({
    mutationFn: (bizId) => bizApi.unsuspend(bizId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-businesses'] }); toast.success('Business unsuspended'); },
    onError: (e) => toast.error(e.message || 'Unsuspend failed'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Businesses</h1>
        <p className="text-sm text-az-text-secondary mt-1">{total} total businesses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Businesses" value={total} icon={Building2} color="blue" />
        <StatCard label="Verified" value={list.filter((b) => b.kybStatus === 'VERIFIED').length} icon={CheckCircle2} color="emerald" />
        <StatCard label="Pending KYB" value={list.filter((b) => b.kybStatus === 'PENDING').length} icon={FileCheck} color="amber" />
        <StatCard label="Suspended" value={list.filter((b) => b.isSuspended).length} icon={Ban} color="red" />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-az-text-muted" />
          <Input placeholder="Search by name or BIZ id…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                 className="pl-9 bg-az-surface border-az-border text-white" />
        </div>
        <select value={kybFilter} onChange={(e) => { setKybFilter(e.target.value); setPage(1); }}
                className="bg-az-surface border border-az-border rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All KYB</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="UNVERIFIED">Unverified</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-az-surface border border-az-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-az-border text-xs text-az-text-muted uppercase tracking-wide">
          <span className="col-span-3">Business</span>
          <span className="col-span-2">Owner</span>
          <span>KYB</span>
          <span className="text-right">Escrows</span>
          <span className="col-span-2 text-right">Volume (USDC)</span>
          <span>Status</span>
          <span className="col-span-2 text-right">Actions</span>
        </div>
        {isLoading && <p className="text-az-text-muted text-sm text-center py-8">Loading…</p>}
        {!isLoading && list.length === 0 && (
          <div className="text-center py-12 text-az-text-muted">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No businesses found</p>
          </div>
        )}
        {list.map((b) => (
          <div key={b.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-az-border/50 last:border-0 items-center hover:bg-az-card/20 transition-colors">
            <div className="col-span-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">{b.businessName}</p>
              <p className="text-xs text-az-text-muted az-mono truncate">{b.bizId}</p>
            </div>
            <div className="col-span-2 min-w-0">
              <p className="text-xs text-az-text-secondary truncate">{b.owner?.username || '—'}</p>
              <p className="text-xs text-az-text-muted truncate">{b.owner?.email || ''}</p>
            </div>
            <Badge className={`${KYB_COLORS[b.kybStatus] || KYB_COLORS.UNVERIFIED} border-0 text-xs w-fit`}>{b.kybStatus}</Badge>
            <span className="text-xs text-az-text-secondary text-right az-mono">{num(b.totalEscrows)}</span>
            <span className="col-span-2 text-xs text-az-text-secondary text-right az-mono">{num(b.totalVolume).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <Badge className={`${b.isSuspended ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'} border-0 text-xs w-fit`}>
              {b.isSuspended ? 'Suspended' : 'Active'}
            </Badge>
            <div className="col-span-2 flex gap-1 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDetailBizId(b.bizId)} className="h-7 px-2 text-xs text-az-text-secondary hover:text-white hover:bg-az-border" title="View details">
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/business-kyb')} className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" title="View KYB">
                <FileCheck className="w-3.5 h-3.5" />
              </Button>
              {b.isSuspended ? (
                <Button variant="ghost" size="sm" onClick={() => unsuspendMutation.mutate(b.bizId)} disabled={unsuspendMutation.isPending}
                        className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setSuspendTarget(b)} className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Suspend">
                  <Ban className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-az-text-muted">Page {page} of {totalPages} · {total} total</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="border-az-border text-az-text-secondary h-8">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="border-az-border text-az-text-secondary h-8">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <BusinessDetailDialog bizId={detailBizId} onClose={() => setDetailBizId(null)} />

      {/* Suspend confirmation */}
      <Dialog open={!!suspendTarget} onOpenChange={(o) => { if (!o) { setSuspendTarget(null); setSuspendReason(''); } }}>
        <DialogContent className="max-w-md bg-[#13131e] border-[#2a2a3e] text-[#e8e8f0]">
          <DialogHeader>
            <DialogTitle className="text-[#e8e8f0]">Suspend {suspendTarget?.businessName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#7b7b9a]">This hides the business from new activity until unsuspended. Provide a reason.</p>
            <Textarea placeholder="Reason for suspension (required)…" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                      className="bg-[#0a0a12] border-[#2a2a3e] text-[#e8e8f0] text-sm" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setSuspendTarget(null); setSuspendReason(''); }} className="text-[#7b7b9a]">Cancel</Button>
              <Button onClick={() => suspendMutation.mutate({ bizId: suspendTarget.bizId, reason: suspendReason })}
                      disabled={!suspendReason.trim() || suspendMutation.isPending}
                      className="bg-red-500/20 text-red-400 border border-red-500/30">
                <Ban className="w-4 h-4 mr-2" /> Confirm Suspend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
