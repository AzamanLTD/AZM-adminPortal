const CAT_ICON = { HOTEL: Hotel, RESTAURANT: UtensilsCrossed, TRANSIT: Bus };
const CAT_COLOR = { HOTEL: 'text-[var(--f-info)]', RESTAURANT: 'text-[var(--f-warn)]', TRANSIT: 'text-[var(--f-ok)]' };
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businesses as bizApi } from '@/lib/api';
import StatCard from '@/components/admin/StatCard';
import { Button, Input, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, Tag } from '@/components/forge';
import { Building2, Ban, CheckCircle2, Search, FileCheck, ChevronLeft, ChevronRight, Eye, Hotel, UtensilsCrossed, Bus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const KYB_COLORS = {
  VERIFIED:   'bg-[var(--f-ok-bg)] text-[var(--f-ok)]',
  PENDING:    'bg-[var(--f-warn-bg)] text-[var(--f-warn)]',
  REJECTED:   'bg-[var(--f-bad-bg)] text-[var(--f-bad)]',
  UNVERIFIED: 'bg-surface-sunken text-ink-2',
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
      <DialogContent className="max-w-lg bg-[var(--f-surface-raised)] border-[var(--f-line-strong)] text-[var(--f-text)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--f-text)]">Business Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-[var(--f-text-2)] py-6 text-center">Loading…</p>
        ) : !biz ? (
          <p className="text-sm text-[var(--f-text-3)] py-6 text-center">Business not found</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {biz.logoUrl
                ? <img src={biz.logoUrl} alt={biz.businessName} className="w-12 h-12 rounded-xl object-cover" />
                : <div className="w-12 h-12 rounded-xl bg-[var(--f-line)] flex items-center justify-center"><Building2 className="w-5 h-5 text-[var(--f-text-3)]" /></div>}
              <div>
                <p className="font-bold text-[var(--f-text)]">{biz.businessName}</p>
                <p className="text-xs text-[var(--f-text-3)] f-mono">{biz.bizId}</p>
              </div>
            </div>
            {biz.description && <p className="text-xs text-[var(--f-text-2)]">{biz.description}</p>}
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
                <div key={k} className="bg-[var(--f-surface)] border border-[var(--f-line)] rounded-lg p-2.5">
                  <p className="text-[var(--f-text-3)]">{k}</p>
                  <p className="text-[var(--f-text)] mt-0.5 truncate">{v}</p>
                </div>
              ))}
            </div>
            {biz.website && <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--f-info)] hover:underline block">{biz.website}</a>}
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [detailBizId, setDetailBizId] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Debounce the search box (400ms) so each keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-businesses', page, search, kybFilter, categoryFilter],
    queryFn: () => bizApi.list(page, search, kybFilter, categoryFilter),
    placeholderData: (prev) => prev,
  });
  const list = data?.businesses || [];
  const total = data?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  const suspendMutation = useMutation({
    mutationFn: /** @param {{ bizId: string | number, reason: string }} data */ ({ bizId, reason }) => bizApi.suspend(bizId, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-businesses'] }); toast.success('Business suspended'); setSuspendTarget(null); setSuspendReason(''); },
    onError: (e) => toast.error(e.message || 'Suspend failed'),
  });
  const unsuspendMutation = useMutation({
    mutationFn: /** @param {string | number} bizId */ (bizId) => bizApi.unsuspend(bizId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-businesses'] }); toast.success('Business unsuspended'); },
    onError: (e) => toast.error(e.message || 'Unsuspend failed'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--f-text)]">Businesses</h1>
        <p className="text-sm text-ink-2 mt-1">{total} total businesses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Businesses" value={total} icon={Building2} color="blue" />
        <StatCard label="Verified" value={data?.verified ?? list.filter((b) => b.kybStatus === 'VERIFIED').length} icon={CheckCircle2} color="emerald" />
        <StatCard label="Pending KYB" value={data?.pendingKyb ?? list.filter((b) => b.kybStatus === 'PENDING').length} icon={FileCheck} color="amber" />
        <StatCard label="Suspended" value={data?.suspended ?? list.filter((b) => b.isSuspended).length} icon={Ban} color="red" />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
          <Input placeholder="Search by name or BIZ id…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                 className="pl-9 bg-[var(--f-surface-raised)] border-line text-[var(--f-text)]" />
        </div>
        <select value={kybFilter} onChange={(e) => { setKybFilter(e.target.value); setPage(1); }}
                className="bg-[var(--f-surface-raised)] border border-line rounded-lg px-3 py-2 text-sm text-[var(--f-text)]">
          <option value="">All KYB</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="UNVERIFIED">Unverified</option>
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="bg-[var(--f-surface-raised)] border border-line rounded-lg px-3 py-2 text-sm text-[var(--f-text)]">
          <option value="">All Types</option>
          <option value="HOTEL">Hotels</option>
          <option value="RESTAURANT">Restaurants</option>
          <option value="TRANSIT">Transit</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-line text-xs text-ink-3 uppercase tracking-wide">
          <span className="col-span-3">Business</span>
          <span className="col-span-2">Owner</span>
          <span>KYB</span>
          <span className="text-right">Escrows</span>
          <span className="col-span-2 text-right">Volume (USDC)</span>
          <span>Status</span>
          <span className="col-span-2 text-right">Actions</span>
        </div>
        {isLoading && <p className="text-ink-3 text-sm text-center py-8">Loading…</p>}
        {!isLoading && list.length === 0 && (
          <div className="text-center py-12 text-ink-3">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No businesses found</p>
          </div>
        )}
        {list.map((b) => (
          <div key={b.id} onClick={() => navigate(`/businesses/${b.bizId}`)} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-line/50 last:border-0 items-center hover:bg-[var(--f-surface-sunken)] transition-colors cursor-pointer">
            <div className="col-span-3 min-w-0 flex items-center gap-2">
              {(() => { const Icon = CAT_ICON[b.category]; return Icon ? <Icon className={`h-4 w-4 shrink-0 ${CAT_COLOR[b.category]||'text-ink-3'}`} /> : <Building2 className="h-4 w-4 shrink-0 text-ink-3" />; })()}
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--f-text)] truncate">{b.businessName}</p>
                <p className="text-xs text-ink-3 font-mono truncate">{b.bizId}</p>
              </div>
            </div>
            <div className="col-span-2 min-w-0">
              <p className="text-xs text-ink-2 truncate">{b.owner?.username || '—'}</p>
              <p className="text-xs text-ink-3 truncate">{b.owner?.email || ''}</p>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${KYB_COLORS[b.kybStatus] || KYB_COLORS.UNVERIFIED}`}>{b.kybStatus}</span>
            <span className="text-xs text-ink-2 text-right f-mono">{num(b.totalEscrows)}</span>
            <span className="col-span-2 text-xs text-ink-2 text-right f-mono">{num(b.totalVolume).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${b.isSuspended ? 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]' : 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]'}`}>{b.isSuspended ? 'Suspended' : 'Active'}</span>
            <div className="col-span-2 flex gap-1 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDetailBizId(b.bizId)} className="h-7 px-2 text-xs text-ink-2 hover:text-[var(--f-text)] hover:bg-line" title="View details">
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/business-kyb')} className="h-7 px-2 text-xs text-[var(--f-info)] hover:text-blue-300 hover:bg-[var(--f-info-bg)]" title="View KYB">
                <FileCheck className="w-3.5 h-3.5" />
              </Button>
              {b.isSuspended ? (
                <Button variant="ghost" size="sm" onClick={() => unsuspendMutation.mutate(b.bizId)} disabled={unsuspendMutation.isPending}
                        className="h-7 px-2 text-xs text-[var(--f-ok)] hover:text-emerald-300 hover:bg-[var(--f-ok-bg)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setSuspendTarget(b)} className="h-7 px-2 text-xs text-[var(--f-bad)] hover:text-red-300 hover:bg-[var(--f-bad-bg)]" title="Suspend">
                  <Ban className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-3">Page {page} of {totalPages} · {total} total</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="border-line text-ink-2 h-8">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="border-line text-ink-2 h-8">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <BusinessDetailDialog bizId={detailBizId} onClose={() => setDetailBizId(null)} />

      {/* Suspend confirmation */}
      <Dialog open={!!suspendTarget} onOpenChange={(o) => { if (!o) { setSuspendTarget(null); setSuspendReason(''); } }}>
        <DialogContent className="max-w-md bg-[var(--f-surface-raised)] border-[var(--f-line-strong)] text-[var(--f-text)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--f-text)]">Suspend {suspendTarget?.businessName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[var(--f-text-2)]">This hides the business from new activity until unsuspended. Provide a reason.</p>
            <Textarea placeholder="Reason for suspension (required)…" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                      className="bg-bg border-[var(--f-line-strong)] text-[var(--f-text)] text-sm" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setSuspendTarget(null); setSuspendReason(''); }} className="text-[var(--f-text-2)]">Cancel</Button>
              <Button onClick={() => suspendMutation.mutate({ bizId: suspendTarget.bizId, reason: suspendReason })}
                      disabled={!suspendReason.trim() || suspendMutation.isPending}
                      className="bg-[var(--f-bad-bg)] text-[var(--f-bad)] border border-[var(--f-bad)]">
                <Ban className="w-4 h-4 mr-2" /> Confirm Suspend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
