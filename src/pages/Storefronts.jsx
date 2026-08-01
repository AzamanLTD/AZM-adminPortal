import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefronts as sfApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/admin/StatCard';
import { Store, ChevronLeft, ChevronRight, Lock, Unlock, History, Image as ImageIcon, X, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function Storefronts() {
  const [page, setPage] = useState(1);
  const [revertTarget, setRevertTarget] = useState(null); // { businessProfileId, businessName }
  const [disableTarget, setDisableTarget] = useState(null); // { id, name }
  const [mediaTarget, setMediaTarget] = useState(null);  // businessProfileId
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-storefronts', page],
    queryFn: () => sfApi.list(page, 20),
  });

  const disableMutation = useMutation({
    mutationFn: sfApi.disable,
    onSuccess: () => {
      toast.success('Storefront disabled');
      queryClient.invalidateQueries({ queryKey: ['admin-storefronts'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const enableMutation = useMutation({
    mutationFn: sfApi.enable,
    onSuccess: () => {
      toast.success('Storefront enabled');
      queryClient.invalidateQueries({ queryKey: ['admin-storefronts'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const revertMutation = useMutation({
    mutationFn: ({ businessProfileId, versionId }) => sfApi.revert(businessProfileId, versionId),
    onSuccess: () => {
      toast.success('Storefront force-reverted');
      setRevertTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-storefronts'] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Fetch media when media modal is open
  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['admin-storefront-media', mediaTarget],
    queryFn: () => sfApi.getMedia(mediaTarget),
    enabled: !!mediaTarget,
  });

  const sf = data?.data;
  const storefronts = sf?.storefronts ?? [];
  const pagination = sf?.pagination;
  const analytics = sf?.analytics ?? [];

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Store className="w-7 h-7 text-[var(--f-warn)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--az-text-primary)]">Storefront Moderation</h1>
          <p className="text-sm text-ink-2">{pagination?.total ?? 0} published storefronts</p>
        </div>
      </div>

      {/* Analytics summary */}
      {analytics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analytics.map(a => (
            <StatCard key={a.eventType} label={a.eventType.replace(/_/g, ' ')} value={a._count} icon={Store} />
          ))}
        </div>
      )}

      {/* Storefront list */}
      <div className="space-y-3">
        {storefronts.length === 0 ? (
          <div className="text-center py-20 text-ink-2">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No published storefronts yet.</p>
          </div>
        ) : (
          storefronts.map((sf) => {
            const biz = sf.businessProfile;
            const disabled = biz?.storefrontDisabled;
            return (
              <div
                key={sf.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-line/50 hover:border-line-bright transition-colors"
              >
                {biz?.logoUrl ? (
                  <img src={biz.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-line flex items-center justify-center">
                    <Store className="w-6 h-6 text-ink-2" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[var(--az-text-primary)] truncate">{biz?.businessName ?? 'Unknown'}</h3>
                  <p className="text-sm text-ink-2">
                    {biz?.category ?? '—'} · Theme: {sf.theme?.name ?? 'Default'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Media review button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMediaTarget(biz.id)}
                    title="Review uploaded media"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>

                  {/* Force revert button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevertTarget({ businessProfileId: biz.id, businessName: biz?.businessName })}
                    title="Force-revert layout"
                  >
                    <History className="w-4 h-4" />
                  </Button>

                  <Tag variant={disabled ? 'destructive' : 'success'}>
                    {disabled ? 'Disabled' : 'Active'}
                  </Tag>

                  {disabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => enableMutation.mutate(biz.id)}
                      disabled={enableMutation.isPending}
                    >
                      <Unlock className="w-4 h-4" />
                      Enable
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDisableTarget({ id: biz.id, name: biz?.businessName })}
                      disabled={disableMutation.isPending}
                    >
                      <Lock className="w-4 h-4" />
                      Disable
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <span className="text-sm text-ink-2">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Media Review Modal ── */}
      {mediaTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setMediaTarget(null)}>
          <div className="max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-2xl bg-[var(--az-surface-3)] border border-line p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[var(--f-warn)]" />
                <h3 className="text-lg font-bold text-[var(--az-text-primary)]">Media Review</h3>
                <span className="text-sm text-ink-2">— {mediaData?.data?.businessName || 'Loading…'}</span>
              </div>
              <button onClick={() => setMediaTarget(null)} className="p-1 rounded-lg text-ink-2 hover:text-[var(--az-text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {mediaLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mediaData?.data?.media?.length ? (
              <div className="grid grid-cols-3 gap-3">
                {mediaData.data.media.map((item, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-line">
                    {item.url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                      <video src={item.url} controls className="w-full h-24 object-cover" />
                    ) : (
                      <img src={item.url} alt="" className="w-full h-24 object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    )}
                    <div className="p-2 bg-surface/50">
                      <p className="text-xs text-ink-2 truncate">{item.widgetType?.replace(/_/g, ' ') || 'media'}</p>
                      <p className="text-[10px] text-ink-3">{item.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-ink-2">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No media found for this storefront.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Force Revert Modal ── */}
      {revertTarget && (
        <RevertModal
          target={revertTarget}
          onClose={() => setRevertTarget(null)}
          onRevert={(versionId) => revertMutation.mutate({ businessProfileId: revertTarget.businessProfileId, versionId })}
          isPending={revertMutation.isPending}
        />
      )}
      <ConfirmDialog
        open={!!disableTarget}
        title="Disable Storefront"
        message={disableTarget ? `Disable storefront for ${disableTarget.name}?` : ''}
        confirmLabel="Disable"
        variant="destructive"
        onConfirm={() => {
          disableMutation.mutate(disableTarget.id);
          setDisableTarget(null);
        }}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  );
}

// ── Revert Modal (fetches version history from public render endpoint) ────────
function RevertModal({ target, onClose, onRevert, isPending }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmRevert, setConfirmRevert] = useState(null); // { version, versionId, businessName }

  // Fetch the storefront render endpoint to get layout data
  // Then we can show the admin what they're reverting to
  useEffect(() => {
    // The admin revert uses the backend's revertToVersion which needs a versionId from the
    // BusinessStorefrontLayoutVersion table. We don't have a direct admin history endpoint,
    // but we can fetch via the storefront render endpoint to show the current state.
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/storefront/${target.businessProfileId}/media`)
      .then(r => r.json())
      .then(() => {
        // We can't directly list versions via admin API yet, but the revert endpoint
        // accepts a versionId. For now, show a confirmation dialog that reverts to the
        // last published version (passing 'latest' as versionId triggers the backend's
        // fallback to the most recent version).
        setVersions([{ id: 'latest', version: 'Latest Published', isLatest: true }]);
        setLoading(false);
      })
      .catch(() => {
        setVersions([{ id: 'latest', version: 'Latest Published', isLatest: true }]);
        setLoading(false);
      });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="max-w-md w-full rounded-2xl bg-[var(--az-surface-3)] border border-line p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--f-warn)]" />
            <h3 className="text-lg font-bold text-[var(--az-text-primary)]">Force Revert</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-ink-2 hover:text-[var(--az-text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--az-amber-soft)] border border-amber-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[var(--f-warn)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            This will force-revert the storefront for <span className="font-bold">{target.businessName}</span> back to the last published version. The merchant will need to re-publish any changes.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-surface/40 border border-line">
                <div>
                  <p className="text-sm font-semibold text-[var(--az-text-primary)]">{v.version}</p>
                  {v.isLatest && <p className="text-xs text-ink-2">Safest revert option</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRevert({ version: v.version, versionId: v.id, businessName: target.businessName })}
                  disabled={isPending}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Revert
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!confirmRevert}
        title="Force Revert Version"
        message={confirmRevert ? `Force-revert ${confirmRevert.businessName} to ${confirmRevert.version}?` : ''}
        confirmLabel="Revert"
        variant="destructive"
        onConfirm={() => {
          onRevert(confirmRevert.versionId);
          setConfirmRevert(null);
        }}
        onCancel={() => setConfirmRevert(null)}
      />
    </div>
  );
}
