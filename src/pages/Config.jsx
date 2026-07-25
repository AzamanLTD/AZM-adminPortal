import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ErrorState from '@/components/ErrorState';
import { Settings, Smartphone, Zap, Bot, DollarSign } from 'lucide-react';

export default function Config() {
  const qc = useQueryClient();

  const { data: vg, isError: vgError, refetch: refetchVg } = useQuery({ queryKey: ['version-gate'], queryFn: () => api.versionGate.get().catch(() => ({ minVersion: '1.0.0', updateUrl: '', message: '', _error: true })) });
  const { data: po, isError: poError, refetch: refetchPo } = useQuery({ queryKey: ['payout-settings'], queryFn: () => api.payouts.getSettings().catch(() => ({ threshold: 100, maxAmount: 1000, intervalHours: 24, enabled: true, _error: true })) });
  const { data: gs, isError: gsError, refetch: refetchGs } = useQuery({ queryKey: ['global-settings'], queryFn: () => api.settings.get().catch(() => ({ settings: { susuProfitPct: 0.03 }, _error: true })) });

  const hasAnyError = vgError || poError || gsError;

  const [vgForm, setVgForm] = useState({});
  const [poForm, setPoForm] = useState({});
  const [gsForm, setGsForm] = useState({});

  const updateVg = useMutation({ mutationFn: (d) => api.versionGate.update(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['version-gate'] }); toast.success('Version gate updated'); } });
  const updatePo = useMutation({ mutationFn: (d) => api.payouts.updateSettings(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['payout-settings'] }); toast.success('Payout settings updated'); } });
  const updateGs = useMutation({ mutationFn: (d) => api.settings.update(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['global-settings'] }); toast.success('Susu settings updated'); } });
  const batchProcess = useMutation({ mutationFn: () => api.payouts.batchProcess(), onSuccess: () => toast.success('Payout batch triggered') });

  const vgData = { ...vg, ...vgForm };
  const poData = { ...po, ...poForm };
  const gsData = { ...(gs?.settings || {}), ...gsForm };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">System Configuration</h1>
        <p className="text-sm text-az-text-secondary mt-1">App version gate, payout automation, and system controls.</p>
      </div>

      {hasAnyError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 text-sm">
          <span className="text-amber-400">⚠ Some settings failed to load. Values shown may be defaults.</span>
          <div className="flex gap-2 ml-auto">
            {vgError && <Button variant="ghost" size="sm" onClick={refetchVg} className="h-7 text-xs">Retry VG</Button>}
            {poError && <Button variant="ghost" size="sm" onClick={refetchPo} className="h-7 text-xs">Retry PO</Button>}
            {gsError && <Button variant="ghost" size="sm" onClick={refetchGs} className="h-7 text-xs">Retry GS</Button>}
          </div>
        </div>
      )}

      {/* Version Gate */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-az-text-secondary">App Version Gate</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Minimum Version</label>
            <Input value={vgData.minVersion || ''} onChange={(e) => setVgForm((f) => ({ ...f, minVersion: e.target.value }))} className="bg-az-card border-az-border text-white" placeholder="1.2.0" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Update URL</label>
            <Input value={vgData.updateUrl || ''} onChange={(e) => setVgForm((f) => ({ ...f, updateUrl: e.target.value }))} className="bg-az-card border-az-border text-white" placeholder="https://play.google.com/..." />
          </div>
        </div>
        <div>
          <label className="text-xs text-az-text-secondary block mb-1">Update Message</label>
          <Input value={vgData.message || ''} onChange={(e) => setVgForm((f) => ({ ...f, message: e.target.value }))} className="bg-az-card border-az-border text-white" placeholder="Please update to continue using the app." />
        </div>
        <Button onClick={() => updateVg.mutate(vgData)} className="bg-blue-600 hover:bg-blue-500 text-white">
          Save Version Gate
        </Button>
      </div>

      {/* Payout Automation */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-az-text-secondary">Autonomous Payout Settings</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Auto-payout Threshold ($)</label>
            <Input type="number" value={poData.threshold || ''} onChange={(e) => setPoForm((f) => ({ ...f, threshold: parseFloat(e.target.value) }))} className="bg-az-card border-az-border text-white" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Max Amount per Payout ($)</label>
            <Input type="number" value={poData.maxAmount || ''} onChange={(e) => setPoForm((f) => ({ ...f, maxAmount: parseFloat(e.target.value) }))} className="bg-az-card border-az-border text-white" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Interval (hours)</label>
            <Input type="number" value={poData.intervalHours || ''} onChange={(e) => setPoForm((f) => ({ ...f, intervalHours: parseInt(e.target.value) }))} className="bg-az-card border-az-border text-white" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Enabled</label>
            <select value={poData.enabled ? 'true' : 'false'} onChange={(e) => setPoForm((f) => ({ ...f, enabled: e.target.value === 'true' }))} className="w-full bg-az-card border border-az-border rounded-lg px-3 py-2 text-sm text-white">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => updatePo.mutate(poData)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            Save Payout Settings
          </Button>
          <Button variant="outline" onClick={() => batchProcess.mutate()} className="border-az-border text-az-text-secondary hover:bg-az-card">
            Trigger Batch Now
          </Button>
        </div>
      </div>

      {/* Phase 5: Susu Profit Percentage */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-az-text-secondary">Susu Platform Fee</h2>
        </div>
        <p className="text-xs text-az-text-secondary">
          The platform fee percentage deducted from each Susu cycle payout. Default is 3% (0.03).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Profit Percentage (0-1)</label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={gsData.susuProfitPct ?? 0.03}
              onChange={(e) => setGsForm((f) => ({ ...f, susuProfitPct: parseFloat(e.target.value) }))}
              className="bg-az-card border-az-border text-white"
              placeholder="0.03"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 w-full">
              <p className="text-xs text-amber-400 font-semibold">
                Current: {((gsData.susuProfitPct ?? 0.03) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => updateGs.mutate({ susuProfitPct: gsData.susuProfitPct })} className="bg-amber-600 hover:bg-amber-500 text-white">
          Save Susu Fee
        </Button>
      </div>

      {/* KYC Provider note */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-az-text-secondary">KYC Provider</h2>
        </div>
        <p className="text-xs text-az-text-secondary">Currently using manual admin KYC approval. Once Dojah integration is live, approved KYC submissions will be auto-verified and this panel will display the Dojah webhook status and configuration.</p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-xs text-amber-400">Temporary: Admin manually approves KYC from the Users tab. Hook up Dojah webhook URL once your company registration is complete.</p>
        </div>
      </div>
    </div>
  );
}