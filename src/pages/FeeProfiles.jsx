import { useState } from 'react';
import { useFinancialFeeProfiles } from '@/lib/useFinancialFeeProfiles';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { financialApi } from '@/lib/financialApi';
import { Button } from '@/components/forge';
import { Input } from '@/components/forge';
import { Plus, Edit2, Trash2, Zap, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import ErrorState from '@/components/ErrorState';

const SCOPES = ['ALL', 'HOLIDAY', 'CUSTOM'];
const SCOPE_COLORS = { ALL: 'bg-[var(--f-info-bg)] text-[var(--f-info)]', HOLIDAY: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]', CUSTOM: 'bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)]' };

const EMPTY = { name: '', targetScope: 'ALL', targetValue: '', platformFeePct: '2', adminSplitPct: '60', vendorSplitPct: '40', exitFeePct: '2', priority: '0', validFrom: '', validUntil: '' };

export default function FeeProfiles() {
  const { data: profiles = [], isLoading, isError, refetch } = useFinancialFeeProfiles();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const createMutation = useMutation({
    /** @param {Record<string, unknown>} d */
    mutationFn: (d) => financialApi.fees.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'fee-profiles'] }); toast.success('Fee profile created'); setShowForm(false); },
  });
  const updateMutation = useMutation({
    /** @param {{ id: string | number, [key: string]: unknown }} data */
    mutationFn: ({ id, ...d }) => financialApi.fees.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'fee-profiles'] }); toast.success('Fee profile updated'); setEditing(null); },
  });
  const deleteMutation = useMutation({
    /** @param {string | number} id */
    mutationFn: (id) => financialApi.fees.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'fee-profiles'] }); toast.success('Fee profile deactivated'); },
  });

  const [form, setForm] = useState(EMPTY);
  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function openNew() { setForm(EMPTY); setEditing(null); setShowForm(true); }
  function openEdit(p) {
    setForm({ ...p, platformFeePct: (p.platformFeePct * 100).toFixed(2), adminSplitPct: (p.adminSplitPct * 100).toFixed(2), vendorSplitPct: (p.vendorSplitPct * 100).toFixed(2), exitFeePct: (p.exitFeePct * 100).toFixed(2), validFrom: p.validFrom || '', validUntil: p.validUntil || '' });
    setEditing(p.id); setShowForm(true);
  }
  function submit(e) {
    e.preventDefault();
    const payload = { name: form.name, targetScope: form.targetScope, targetValue: form.targetValue || null, platformFeePct: parseFloat(form.platformFeePct) / 100, adminSplitPct: parseFloat(form.adminSplitPct) / 100, vendorSplitPct: parseFloat(form.vendorSplitPct) / 100, exitFeePct: parseFloat(form.exitFeePct) / 100, priority: parseInt(form.priority), validFrom: form.validFrom || null, validUntil: form.validUntil || null, isActive: true };
    if (editing) updateMutation.mutate({ id: editing, ...payload });
    else createMutation.mutate(payload);
  }

  const adminPct = parseFloat(String(form.adminSplitPct || '0'));
  const vendorPct = parseFloat(String(form.vendorSplitPct || '0'));
  const splitValid = Math.abs(adminPct + vendorPct - 100) < 0.01;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--f-text)]">Fee Profiles</h1>
          <p className="text-sm text-ink-2 mt-1">Custom fee rules that override global settings. Higher priority wins.</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]">
          <Plus className="w-4 h-4 mr-2" /> New Profile
        </Button>
      </div>

      {/* Priority chain explanation */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-4 flex items-center gap-3 text-xs text-ink-2">
        <Zap className="w-4 h-4 text-[var(--f-ok)] flex-shrink-0" />
        <span>Resolution order: <strong className="text-[var(--f-tint-color)]">CUSTOM (user-specific)</strong> → <strong className="text-[var(--f-warn)]">HOLIDAY (time-windowed)</strong> → <strong className="text-[var(--f-info)]">ALL (global override)</strong> → <strong className="text-ink-2">Hardcoded fallback</strong>. Highest priority number wins within same scope.</span>
      </div>

      {/* Profile list */}
      <div className="space-y-3">
        {isLoading && <p className="text-ink-3 text-sm">Loading…</p>}
        {isError && <ErrorState message="Failed to load fee profiles." onRetry={refetch} />}
        {profiles.map((p) => (
          <div key={p.id} className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--f-text)]">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCOPE_COLORS[p.targetScope]}`}>{p.targetScope}</span>
                  <span className="text-xs bg-[var(--f-surface-sunken)] text-ink-2 px-2 py-0.5 rounded-full">Priority {p.priority}</span>
                  {!p.isActive && <span className="text-xs bg-[var(--f-bad-bg)] text-[var(--f-bad)] px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
                  <span className="text-ink-2">Platform fee: <strong className="text-[var(--f-ok)]">{(p.platformFeePct * 100).toFixed(2)}%</strong></span>
                  <span className="text-ink-2">Admin split: <strong className="text-[var(--f-info)]">{(p.adminSplitPct * 100).toFixed(0)}%</strong></span>
                  <span className="text-ink-2">Vendor split: <strong className="text-[var(--f-warn)]">{(p.vendorSplitPct * 100).toFixed(0)}%</strong></span>
                  <span className="text-ink-2">Exit fee: <strong className="text-[var(--f-bad)]">{(p.exitFeePct * 100).toFixed(2)}%</strong></span>
                </div>
                {p.validFrom && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-ink-3">
                    <Calendar className="w-3 h-3" />
                    <span>Active: {p.validFrom} → {p.validUntil || 'no end'}</span>
                  </div>
                )}
                {p.targetScope === 'CUSTOM' && p.targetValue && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-ink-3">
                    <User className="w-3 h-3" />
                    <span>Targets user IDs: {p.targetValue}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="text-ink-2 hover:text-[var(--f-text)] hover:bg-[var(--f-surface-sunken)] h-8 w-8 p-0">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(p.id)} className="text-[var(--f-bad)] hover:text-red-300 hover:bg-[var(--f-bad-bg)] h-8 w-8 p-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && profiles.length === 0 && (
          <div className="text-center py-12 text-ink-3 text-sm">No fee profiles yet. Create one above to override global fees.</div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 f-scrim flex items-center justify-center p-4">
          <div className="bg-[var(--f-surface-raised)] border border-line rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-[var(--f-text)] mb-4">{editing ? 'Edit Fee Profile' : 'New Fee Profile'}</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs text-ink-2 block mb-1">Profile Name</label>
                <Input value={form.name} onChange={(e) => setF('name', e.target.value)} required className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" placeholder="e.g. Holiday Discount" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Scope</label>
                  <select value={form.targetScope} onChange={(e) => setF('targetScope', e.target.value)} className="w-full bg-[var(--f-surface-sunken)] border border-line rounded-lg px-3 py-2 text-sm text-[var(--f-text)]">
                    {SCOPES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Priority</label>
                  <Input type="number" value={form.priority} onChange={(e) => setF('priority', e.target.value)} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
                </div>
              </div>
              {form.targetScope === 'CUSTOM' && (
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Target User IDs (comma-separated)</label>
                  <Input value={form.targetValue} onChange={(e) => setF('targetValue', e.target.value)} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" placeholder="42,67,104" />
                </div>
              )}
              {form.targetScope === 'HOLIDAY' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-ink-2 block mb-1">Valid From</label>
                    <Input type="date" value={form.validFrom} onChange={(e) => setF('validFrom', e.target.value)} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-2 block mb-1">Valid Until</label>
                    <Input type="date" value={form.validUntil} onChange={(e) => setF('validUntil', e.target.value)} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Platform Fee %</label>
                  <Input type="number" step="0.01" value={form.platformFeePct} onChange={(e) => setF('platformFeePct', e.target.value)} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
                </div>
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Exit Fee %</label>
                  <Input type="number" step="0.01" value={form.exitFeePct} onChange={(e) => setF('exitFeePct', e.target.value)} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
                </div>
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Admin Split %</label>
                  <Input type="number" step="0.01" value={form.adminSplitPct} onChange={(e) => { setF('adminSplitPct', e.target.value); setF('vendorSplitPct', (100 - parseFloat(e.target.value || 0)).toFixed(2)); }} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
                </div>
                <div>
                  <label className="text-xs text-ink-2 block mb-1">Vendor Split % (auto)</label>
                  <Input type="number" step="0.01" value={form.vendorSplitPct} onChange={(e) => { setF('vendorSplitPct', e.target.value); setF('adminSplitPct', (100 - parseFloat(e.target.value || 0)).toFixed(2)); }} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
                </div>
              </div>
              {!splitValid && <p className="text-xs text-[var(--f-bad)]">Admin + Vendor must sum to 100%</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 border-line text-ink-2">Cancel</Button>
                <Button type="submit" disabled={!splitValid} className="flex-1 bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]">
                  {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
