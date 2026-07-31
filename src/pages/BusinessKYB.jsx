import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessKyb } from '@/lib/api';
import StatCard from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileCheck, CheckCircle2, XCircle, Eye, Building2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPE_LABELS = {
  BUSINESS_REGISTRATION_CERT: 'Business Registration Certificate',
  DIRECTOR_ID_FRONT:          'Director ID — Front',
  DIRECTOR_ID_BACK:           'Director ID — Back',
  TAX_IDENTIFICATION:         'Tax Identification',
  PROOF_OF_ADDRESS:           'Proof of Address',
  SELFIE_WITH_ID:             'Selfie with ID',
  OTHER:                      'Other Document',
};

const KYB_STATUS_STYLE = {
  PENDING:    'bg-[var(--az-amber-soft)] text-[var(--az-amber)] border-amber-500/30',
  APPROVED:   'bg-[var(--az-emerald-soft)] text-[var(--az-emerald)] border-[var(--az-emerald-glow)]',
  REJECTED:   'bg-[var(--az-red-soft)] text-[var(--az-red)] border-[var(--az-red-glow)]',
  VERIFIED:   'bg-[var(--az-emerald-soft)] text-[var(--az-emerald)] border-[var(--az-emerald-glow)]',
  UNVERIFIED: 'bg-az-text-muted/20 text-az-text-secondary border-az-text-muted/30',
};

// Maps the page's tab labels onto the backend KybStatus the queue filters by.
const TAB_TO_STATUS = { PENDING: 'PENDING', APPROVED: 'VERIFIED', REJECTED: 'REJECTED' };

function DocumentCard({ doc }) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [notes, setNotes] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const qc = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: ({ status, reviewNotes }) => businessKyb.reviewDoc(doc.id, status, reviewNotes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biz-kyb'] }); toast.success('Document reviewed'); },
    onError: (e) => toast.error(e.message || 'Review failed'),
  });

  return (
    <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#7b7b9a]">{DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${KYB_STATUS_STYLE[doc.status]}`}>{doc.status}</span>
      </div>

      <div className="relative cursor-pointer rounded-lg overflow-hidden bg-[#13131e] h-32 group"
           onClick={() => setLightboxOpen(true)}>
        <img src={doc.documentUrl} alt={doc.documentType}
             className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
          <Eye className="w-6 h-6 text-[var(--az-text-primary)]" />
        </div>
      </div>

      {doc.reviewNotes && doc.status === 'REJECTED' && (
        <p className="text-xs text-[var(--az-red)]/80 bg-[var(--az-red-soft)] border border-[var(--az-red-glow)] rounded-lg px-2.5 py-1.5">{doc.reviewNotes}</p>
      )}

      {doc.status === 'PENDING' && !showRejectInput && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => reviewMutation.mutate({ status: 'APPROVED' })}
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-[var(--az-emerald)] border border-emerald-600/30 h-8">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
          </Button>
          <Button size="sm" onClick={() => setShowRejectInput(true)}
                  className="flex-1 bg-[var(--az-red-soft)] hover:bg-[var(--az-red-soft)] text-[var(--az-red)] border border-[var(--az-red-glow)] h-8">
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
          </Button>
        </div>
      )}

      {showRejectInput && (
        <div className="space-y-2">
          <Textarea placeholder="Reason for rejection..." value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="bg-[#13131e] border-[#2a2a3e] text-[#e8e8f0] text-xs min-h-[60px]" />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setShowRejectInput(false); setNotes(''); }} className="text-[#7b7b9a] h-8">Cancel</Button>
            <Button size="sm" onClick={() => reviewMutation.mutate({ status: 'REJECTED', reviewNotes: notes })}
                    disabled={!notes.trim() || reviewMutation.isPending}
                    className="flex-1 bg-[var(--az-red-soft)] text-[var(--az-red)] border border-[var(--az-red-glow)] h-8">
              Confirm Reject
            </Button>
          </div>
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl bg-[#13131e] border-[#2a2a3e]">
          <img src={doc.documentUrl} alt={doc.documentType} className="w-full rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BusinessKYB() {
  const [activeTab, setActiveTab] = useState('PENDING');
  const [selectedId, setSelectedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBizInput, setShowRejectBizInput] = useState(false);
  const qc = useQueryClient();

  // The backend filters the queue server-side by a single KybStatus, so we run
  // one query per status: the active tab drives the list, the other two feed the
  // stat counts without an extra round-trip when the operator switches tabs.
  const pendingQ  = useQuery({ queryKey: ['biz-kyb', 'PENDING'],  queryFn: () => businessKyb.queue('PENDING') });
  const verifiedQ = useQuery({ queryKey: ['biz-kyb', 'VERIFIED'], queryFn: () => businessKyb.queue('VERIFIED') });
  const rejectedQ = useQuery({ queryKey: ['biz-kyb', 'REJECTED'], queryFn: () => businessKyb.queue('REJECTED') });

  const queues = {
    PENDING:  pendingQ.data?.businesses || [],
    VERIFIED: verifiedQ.data?.businesses || [],
    REJECTED: rejectedQ.data?.businesses || [],
  };
  const isLoading = pendingQ.isLoading || verifiedQ.isLoading || rejectedQ.isLoading;

  const activeList = queues[TAB_TO_STATUS[activeTab]];
  const selectedBiz = [...queues.PENDING, ...queues.VERIFIED, ...queues.REJECTED]
    .find((b) => b.id === selectedId) || null;

  const pendingCount  = queues.PENDING.length;
  const verifiedCount = queues.VERIFIED.length;
  const rejectedCount = queues.REJECTED.length;
  const totalCount    = pendingCount + verifiedCount + rejectedCount;

  const approveBiz = useMutation({
    mutationFn: (bizId) => businessKyb.approve(bizId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biz-kyb'] }); toast.success('Business KYB approved — status: VERIFIED'); setSelectedId(null); },
    onError: (e) => toast.error(e.message || 'Approval failed'),
  });

  const rejectBiz = useMutation({
    mutationFn: ({ bizId, reason }) => businessKyb.reject(bizId, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biz-kyb'] }); toast.success('Business KYB rejected'); setSelectedId(null); setShowRejectBizInput(false); setRejectReason(''); },
    onError: (e) => toast.error(e.message || 'Rejection failed'),
  });

  const allDocsApproved = selectedBiz?.verificationDocuments?.length > 0 &&
    selectedBiz.verificationDocuments.every((d) => d.status === 'APPROVED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e8e8f0]">Business KYB Review</h1>
          <p className="text-sm text-[#7b7b9a] mt-1">Verify business identity documents</p>
        </div>
        {pendingCount > 0 && <span className="text-xs bg-[var(--az-amber-soft)] text-[var(--az-amber)] border border-amber-500/30 rounded-full px-3 py-1 font-semibold">{pendingCount} Pending</span>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-[#1e1e2e]" />) : (<>
          <StatCard label="Pending Review" value={pendingCount} icon={Clock} color="amber" />
          <StatCard label="Verified" value={verifiedCount} icon={CheckCircle2} color="emerald" />
          <StatCard label="Rejected" value={rejectedCount} icon={XCircle} color="red" />
          <StatCard label="Total Loaded" value={totalCount} icon={Building2} color="blue" />
        </>)}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#13131e] border border-[#2a2a3e] rounded-xl p-1 w-fit">
        {['PENDING', 'APPROVED', 'REJECTED'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedId(null); }}
                  className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${activeTab === tab ? 'bg-[#2a2a3e] text-[var(--az-text-primary)]' : 'text-[#4a4a6a] hover:text-[#7b7b9a]'}`}>
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Queue List */}
        <div className="space-y-3">
          {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-[#1e1e2e]" />) :
           activeList.length === 0 ? (
             <div className="text-center py-12 text-[#4a4a6a]">
               <FileCheck className="w-8 h-8 mx-auto mb-3 opacity-40" />
               <p className="text-sm">No {activeTab.toLowerCase()} submissions</p>
             </div>
           ) : activeList.map((biz) => (
             <div key={biz.id} onClick={() => setSelectedId(biz.id)}
                  className={`bg-[#13131e] border rounded-2xl p-4 cursor-pointer transition-all hover:border-[#4f8ef7]/40 ${selectedId === biz.id ? 'border-[#4f8ef7]/60 bg-[#1a1a2e]' : 'border-[#2a2a3e]'}`}>
               <div className="flex items-start justify-between gap-3">
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-semibold text-[#e8e8f0] truncate">{biz.businessName}</p>
                   <p className="text-xs text-[#4a4a6a] mt-0.5 truncate">{biz.user?.username} · {biz.user?.email}</p>
                   <p className="text-xs text-[#4a4a6a] mt-0.5">{biz.verificationDocuments?.length || 0} document(s)</p>
                 </div>
                 <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${KYB_STATUS_STYLE[biz.kybStatus]}`}>{biz.kybStatus}</span>
               </div>
             </div>
           ))
          }
        </div>

        {/* Document Review Panel */}
        <div className="lg:col-span-2">
          {!selectedBiz ? (
             <div className="bg-[#13131e] border border-[#2a2a3e] rounded-2xl p-12 text-center text-[#4a4a6a]">
               <FileCheck className="w-10 h-10 mx-auto mb-4 opacity-30" />
               <p className="text-sm">Select a business to review documents</p>
             </div>
          ) : (
             <div className="bg-[#13131e] border border-[#2a2a3e] rounded-2xl p-5 space-y-5">
               {/* Business header */}
               <div className="flex items-center justify-between gap-3">
                 <div className="min-w-0">
                   <p className="text-base font-bold text-[#e8e8f0] truncate">{selectedBiz.businessName}</p>
                   <p className="text-xs text-[#7b7b9a] mt-0.5">{selectedBiz.user?.username} · {selectedBiz.bizId}</p>
                 </div>
                 <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${KYB_STATUS_STYLE[selectedBiz.kybStatus]}`}>{selectedBiz.kybStatus}</span>
               </div>

               {/* Documents grid */}
               {selectedBiz.verificationDocuments?.length ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {selectedBiz.verificationDocuments.map((d) => <DocumentCard key={d.id} doc={d} />)}
                 </div>
               ) : (
                 <p className="text-sm text-[#4a4a6a] text-center py-6">No documents submitted</p>
               )}

               {/* Overall business action */}
               {selectedBiz.kybStatus === 'PENDING' && (
                 <div className="border-t border-[#2a2a3e] pt-4 space-y-3">
                   <p className="text-xs text-[#7b7b9a]">After reviewing all documents above, make a final decision on this business.</p>
                   {!allDocsApproved && (
                     <div className="flex items-center gap-2 bg-[var(--az-amber-soft)] border border-amber-500/30 rounded-xl px-3 py-2">
                       <Clock className="w-3.5 h-3.5 text-[var(--az-amber)] flex-shrink-0" />
                       <span className="text-xs text-[var(--az-amber)]">All documents must be APPROVED before the business can be verified.</span>
                     </div>
                   )}
                   {!showRejectBizInput ? (
                     <div className="flex gap-3">
                       <Button onClick={() => approveBiz.mutate(selectedBiz.bizId)}
                               disabled={approveBiz.isPending || !allDocsApproved}
                               className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-[var(--az-emerald)] border border-emerald-600/30 disabled:opacity-40">
                         <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Business
                       </Button>
                       <Button onClick={() => setShowRejectBizInput(true)}
                               className="flex-1 bg-[var(--az-red-soft)] hover:bg-[var(--az-red-soft)] text-[var(--az-red)] border border-[var(--az-red-glow)]">
                         <XCircle className="w-4 h-4 mr-2" /> Reject Business
                       </Button>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <Textarea placeholder="Reason for business rejection (required)..."
                                 value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                                 className="bg-[#0a0a12] border-[#2a2a3e] text-[#e8e8f0] text-sm" />
                       <div className="flex gap-2">
                         <Button variant="ghost" onClick={() => { setShowRejectBizInput(false); setRejectReason(''); }} className="text-[#7b7b9a]">Cancel</Button>
                         <Button onClick={() => rejectBiz.mutate({ bizId: selectedBiz.bizId, reason: rejectReason })}
                                 disabled={!rejectReason.trim() || rejectBiz.isPending}
                                 className="flex-1 bg-[var(--az-red-soft)] text-[var(--az-red)] border border-[var(--az-red-glow)]">
                           Confirm Reject Business
                         </Button>
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
