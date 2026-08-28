import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock3, History, Lock, Save, ShieldCheck, RotateCcw } from 'lucide-react';
import { Button, Input } from '@/components/forge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useGlobalSettings, useUpdateSettings } from '@/lib/useAdminData';

const DEFAULTS = {
  smartEscrowFeePct: 0.005,
  escrowDraftExpiryHours: 24,
  escrowFundedExpiryDays: 30,
};

function percentFromDecimal(value) {
  const n = Number(value);
  return Number.isFinite(n) ? (n * 100).toFixed(2) : '';
}

function decimalFromPercent(value) {
  return Number(value) / 100;
}

function timeAgo(value) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function SmartEscrowPolicy() {
  const { data: settings, isLoading, isError, refetch } = useGlobalSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin', 'audit-log', 'smart-escrow-policy'],
    queryFn: () => api.auditLog.list(1, { action: 'UPDATE_SETTINGS', limit: 50 }),
    staleTime: 30000,
  });

  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings || form) return;
    setForm({
      feePct: percentFromDecimal(settings.smartEscrowFeePct ?? DEFAULTS.smartEscrowFeePct),
      draftExpiryHours: Number(settings.escrowDraftExpiryHours ?? DEFAULTS.escrowDraftExpiryHours),
      fundedExpiryDays: Number(settings.escrowFundedExpiryDays ?? DEFAULTS.escrowFundedExpiryDays),
    });
  }, [settings, form]);

  const changes = useMemo(() => {
    const logs = auditData?.logs || [];
    return logs.filter((log) => {
      const keys = Object.keys(log.changes || {});
      return keys.some((key) => ['smartEscrowFeePct', 'escrowDraftExpiryHours', 'escrowFundedExpiryDays'].includes(key));
    }).slice(0, 10);
  }, [auditData]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function reset() {
    setForm({
      feePct: percentFromDecimal(settings?.smartEscrowFeePct ?? DEFAULTS.smartEscrowFeePct),
      draftExpiryHours: Number(settings?.escrowDraftExpiryHours ?? DEFAULTS.escrowDraftExpiryHours),
      fundedExpiryDays: Number(settings?.escrowFundedExpiryDays ?? DEFAULTS.escrowFundedExpiryDays),
    });
    setDirty(false);
  }

  function save() {
    const feePct = Number(form.feePct);
    const draftExpiryHours = Number(form.draftExpiryHours);
    const fundedExpiryDays = Number(form.fundedExpiryDays);

    if (!Number.isFinite(feePct) || feePct < 0 || feePct > 100) {
      toast.error('Escrow fee must be between 0% and 100%.');
      return;
    }
    if (!Number.isInteger(draftExpiryHours) || draftExpiryHours < 1 || draftExpiryHours > 720) {
      toast.error('Draft expiry must be a whole number from 1 to 720 hours.');
      return;
    }
    if (!Number.isInteger(fundedExpiryDays) || fundedExpiryDays < 1 || fundedExpiryDays > 3650) {
      toast.error('Funded expiry must be a whole number from 1 to 3650 days.');
      return;
    }

    updateSettings({
      smartEscrowFeePct: decimalFromPercent(feePct),
      escrowDraftExpiryHours: draftExpiryHours,
      escrowFundedExpiryDays: fundedExpiryDays,
    }, {
      onSuccess: () => {
        setDirty(false);
        toast.success('Smart Escrow policy saved. New lifecycle events use the new policy.');
      },
      onError: (error) => toast.error(error.message || 'Failed to save Smart Escrow policy.'),
    });
  }

  if (isLoading || !form) {
    return <div className="text-ink-2 text-sm p-8 text-center">Loading Smart Escrow policy…</div>;
  }

  if (isError) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-[var(--f-bad)]">Smart Escrow policy could not be loaded.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--f-info)]" />
            <h1 className="text-xl font-bold text-[var(--f-text)]">Smart Escrow Policy</h1>
          </div>
          <p className="text-sm text-ink-2 mt-1">
            Platform-wide escrow economics and lifecycle controls. These are not merchant settings.
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="w-3.5 h-3.5 mr-2" />Reset</Button>}
          <Button onClick={save} disabled={!dirty || isPending} className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]">
            <Save className="w-3.5 h-3.5 mr-2" />{isPending ? 'Saving…' : 'Save Policy'}
          </Button>
        </div>
      </div>

      <div className="bg-[var(--f-info-bg)] border border-[var(--f-info)]/30 rounded-xl p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-[var(--f-info)] shrink-0 mt-0.5" />
        <div className="text-xs text-ink-2 space-y-1">
          <p className="font-semibold text-[var(--f-text)]">Policy is global; merchant availability is separate.</p>
          <p>The merchant's store setting decides whether customers may choose escrow. These values decide the platform fee and lifecycle windows when escrow is used.</p>
          <p>Existing escrows keep their calculated fee and expiry timestamps. Policy changes apply to new escrow lifecycle events.</p>
        </div>
      </div>

      {dirty && (
        <div className="bg-[var(--f-warn-bg)] border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
          Unsaved changes are only local to this page. Save to apply them to the backend platform settings.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-ink-3">Escrow fee</p>
          <div className="flex items-center gap-2">
            <Input type="number" min="0" max="100" step="0.01" value={form.feePct} onChange={(e) => setField('feePct', e.target.value)} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-lg font-semibold" />
            <span className="text-sm text-ink-2">%</span>
          </div>
          <p className="text-xs text-ink-3">Charged to the payer when the escrow is funded.</p>
        </div>

        <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-ink-3">Draft expiry</p>
          <div className="flex items-center gap-2">
            <Input type="number" min="1" max="720" step="1" value={form.draftExpiryHours} onChange={(e) => setField('draftExpiryHours', Number(e.target.value))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-lg font-semibold" />
            <span className="text-sm text-ink-2">hours</span>
          </div>
          <p className="text-xs text-ink-3">Unfunded escrow window for new orders.</p>
        </div>

        <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-ink-3">Funded expiry</p>
          <div className="flex items-center gap-2">
            <Input type="number" min="1" max="3650" step="1" value={form.fundedExpiryDays} onChange={(e) => setField('fundedExpiryDays', Number(e.target.value))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-lg font-semibold" />
            <span className="text-sm text-ink-2">days</span>
          </div>
          <p className="text-xs text-ink-3">Inactivity window used when new escrows are funded.</p>
        </div>
      </div>

      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-[var(--f-info)]" />
          <h2 className="text-sm font-semibold text-[var(--f-info)] uppercase tracking-wide">Lifecycle preview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[var(--f-surface-sunken)] rounded-lg p-3"><span className="text-ink-3">1</span><p className="font-medium text-[var(--f-text)] mt-1">Checkout creates DRAFT</p><p className="text-ink-3 mt-1">Expires after {form.draftExpiryHours}h if unfunded.</p></div>
          <div className="bg-[var(--f-surface-sunken)] rounded-lg p-3"><span className="text-ink-3">2</span><p className="font-medium text-[var(--f-text)] mt-1">Customer funds</p><p className="text-ink-3 mt-1">Fee is {form.feePct}% of the escrow principal.</p></div>
          <div className="bg-[var(--f-surface-sunken)] rounded-lg p-3"><span className="text-ink-3">3</span><p className="font-medium text-[var(--f-text)] mt-1">FUNDED lifecycle</p><p className="text-ink-3 mt-1">Inactivity window is {form.fundedExpiryDays}d.</p></div>
        </div>
      </div>

      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2"><History className="w-4 h-4 text-[var(--f-info)]" /><h2 className="text-sm font-semibold text-[var(--f-info)] uppercase tracking-wide">Change history</h2></div>
        {auditLoading && <p className="text-xs text-ink-3">Loading…</p>}
        {!auditLoading && changes.length === 0 && <p className="text-xs text-ink-3">No Smart Escrow policy changes recorded.</p>}
        {!auditLoading && changes.map((log) => (
          <div key={log.id} className="bg-[var(--f-surface-sunken)] rounded-lg p-3 border border-line/30">
            <div className="flex justify-between gap-3 text-xs"><span className="text-ink-2">{log.adminName || 'Admin'}</span><span className="text-ink-3">{timeAgo(log.createdAt)}</span></div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(log.changes || {}).filter(([key]) => ['smartEscrowFeePct', 'escrowDraftExpiryHours', 'escrowFundedExpiryDays'].includes(key)).map(([key, change]) => (
                <span key={key} className="text-[10px] px-2 py-1 rounded-full bg-line/50 text-ink-2">
                  {key}: {String(change?.old ?? '?')} → {String(change?.new ?? '?')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
