import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Smartphone, Zap, Bot, DollarSign, Shield, CheckCircle2, Loader2 } from 'lucide-react';

export default function Config() {
  const qc = useQueryClient();

  const { data: vg, isError: vgError, refetch: refetchVg } = useQuery({ queryKey: ['version-gate'], queryFn: () => api.versionGate.get().catch(() => ({ minVersion: '1.0.0', updateUrl: '', message: '', _error: true })) });
  const { data: po, isError: poError, refetch: refetchPo } = useQuery({ queryKey: ['payout-settings'], queryFn: () => api.payouts.getSettings().catch(() => ({ threshold: 100, maxAmount: 1000, intervalHours: 24, enabled: true, _error: true })) });
  const { data: gs, isError: gsError, refetch: refetchGs } = useQuery({ queryKey: ['global-settings'], queryFn: () => api.settings.get().catch(() => ({ settings: { susuProfitPct: 0.03 }, _error: true })) });

  const hasAnyError = vgError || poError || gsError;

  const [vgForm, setVgForm] = useState({});
  const [poForm, setPoForm] = useState({});
  const [gsForm, setGsForm] = useState({});

  // 2FA state
  const { data: twoFAStatus, refetch: refetch2FA } = useQuery({ queryKey: ['2fa', 'status'], queryFn: () => api.twoFactor.status().catch(() => ({ enabled: false, hasSecret: false })) });
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFADisableToken, setTwoFADisableToken] = useState('');

  const setup2FA = useMutation({
    mutationFn: () => api.twoFactor.setup(),
    onSuccess: (data) => { setTwoFASetup(data); toast.success('Scan the QR code with your authenticator app'); },
    onError: () => toast.error('Failed to setup 2FA'),
  });

  const verify2FA = useMutation({
    mutationFn: (token) => api.twoFactor.verify(token),
    onSuccess: () => { setTwoFASetup(null); setTwoFAToken(''); refetch2FA(); qc.invalidateQueries({ queryKey: ['2fa', 'status'] }); toast.success('2FA enabled successfully'); },
    onError: (e) => toast.error(e.message || 'Invalid token'),
  });

  const disable2FA = useMutation({
    mutationFn: (token) => api.twoFactor.disable(token),
    onSuccess: () => { setTwoFADisableToken(''); refetch2FA(); qc.invalidateQueries({ queryKey: ['2fa', 'status'] }); toast.success('2FA disabled'); },
    onError: (e) => toast.error(e.message || 'Invalid token'),
  });

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
        <h1 className="text-xl font-bold text-[var(--az-text-primary)]">System Configuration</h1>
        <p className="text-sm text-az-text-secondary mt-1">App version gate, payout automation, and system controls.</p>
      </div>

      {hasAnyError && (
        <div className="bg-[var(--az-amber-soft)] border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 text-sm">
          <span className="text-[var(--az-amber)]">⚠ Some settings failed to load. Values shown may be defaults.</span>
          <div className="flex gap-2 ml-auto">
            {vgError && <Button variant="ghost" size="sm" onClick={refetchVg} className="h-7 text-xs">Retry VG</Button>}
            {poError && <Button variant="ghost" size="sm" onClick={refetchPo} className="h-7 text-xs">Retry PO</Button>}
            {gsError && <Button variant="ghost" size="sm" onClick={refetchGs} className="h-7 text-xs">Retry GS</Button>}
          </div>
        </div>
      )}

      {/* Version Gate */}
      <div className="bg-[var(--az-surface-2)] border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[var(--az-blue)]" />
          <h2 className="text-sm font-semibold text-az-text-secondary">App Version Gate</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Minimum Version</label>
            <Input value={vgData.minVersion || ''} onChange={(e) => setVgForm((f) => ({ ...f, minVersion: e.target.value }))} className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]" placeholder="1.2.0" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Update URL</label>
            <Input value={vgData.updateUrl || ''} onChange={(e) => setVgForm((f) => ({ ...f, updateUrl: e.target.value }))} className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]" placeholder="https://play.google.com/..." />
          </div>
        </div>
        <div>
          <label className="text-xs text-az-text-secondary block mb-1">Update Message</label>
          <Input value={vgData.message || ''} onChange={(e) => setVgForm((f) => ({ ...f, message: e.target.value }))} className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]" placeholder="Please update to continue using the app." />
        </div>
        <Button onClick={() => updateVg.mutate(vgData)} className="bg-blue-600 hover:bg-[var(--az-blue)] text-[var(--az-text-primary)]">
          Save Version Gate
        </Button>
      </div>

      {/* Payout Automation */}
      <div className="bg-[var(--az-surface-2)] border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--az-emerald)]" />
          <h2 className="text-sm font-semibold text-az-text-secondary">Autonomous Payout Settings</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Auto-payout Threshold ($)</label>
            <Input type="number" value={poData.threshold || ''} onChange={(e) => setPoForm((f) => ({ ...f, threshold: parseFloat(e.target.value) }))} className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Max Amount per Payout ($)</label>
            <Input type="number" value={poData.maxAmount || ''} onChange={(e) => setPoForm((f) => ({ ...f, maxAmount: parseFloat(e.target.value) }))} className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Interval (hours)</label>
            <Input type="number" value={poData.intervalHours || ''} onChange={(e) => setPoForm((f) => ({ ...f, intervalHours: parseInt(e.target.value) }))} className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]" />
          </div>
          <div>
            <label className="text-xs text-az-text-secondary block mb-1">Enabled</label>
            <select value={poData.enabled ? 'true' : 'false'} onChange={(e) => setPoForm((f) => ({ ...f, enabled: e.target.value === 'true' }))} className="w-full bg-[var(--az-surface-3)] border border-az-border rounded-lg px-3 py-2 text-sm text-[var(--az-text-primary)]">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => updatePo.mutate(poData)} className="bg-emerald-600 hover:bg-[var(--az-emerald)] text-[var(--az-text-primary)]">
            Save Payout Settings
          </Button>
          <Button variant="outline" onClick={() => batchProcess.mutate()} className="border-az-border text-az-text-secondary hover:bg-[var(--az-surface-3)]">
            Trigger Batch Now
          </Button>
        </div>
      </div>

      {/* Phase 5: Susu Profit Percentage */}
      <div className="bg-[var(--az-surface-2)] border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--az-amber)]" />
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
              className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]"
              placeholder="0.03"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-[var(--az-amber-soft)] border border-[var(--az-amber-soft)] rounded-lg p-3 w-full">
              <p className="text-xs text-[var(--az-amber)] font-semibold">
                Current: {((gsData.susuProfitPct ?? 0.03) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => updateGs.mutate({ susuProfitPct: gsData.susuProfitPct })} className="bg-amber-600 hover:bg-[var(--az-amber)] text-[var(--az-text-primary)]">
          Save Susu Fee
        </Button>
      </div>


      {/* 2FA Security */}
      <div className="bg-[var(--az-surface-2)] border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--az-emerald)]" />
            <h2 className="text-sm font-semibold text-az-text-secondary">Two-Factor Authentication (TOTP)</h2>
          </div>
          {twoFAStatus?.enabled && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--az-emerald)] bg-[var(--az-emerald-soft)] px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-2.5 h-2.5" /> Enabled
            </span>
          )}
        </div>

        {!twoFAStatus?.enabled && !twoFASetup && (
          <div className="space-y-3">
            <p className="text-xs text-az-text-secondary">Add an extra layer of security to your admin account using a TOTP authenticator app (Google Authenticator, Authy, etc.).</p>
            <Button onClick={() => setup2FA.mutate()} disabled={setup2FA.isPending} className="bg-emerald-600 hover:bg-[var(--az-emerald)] text-[var(--az-text-primary)]">
              {setup2FA.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Setup 2FA
            </Button>
          </div>
        )}

        {twoFASetup && (
          <div className="space-y-3">
            <p className="text-xs text-az-text-secondary">Scan this QR code with your authenticator app, then enter the 6-digit code below.</p>
            <div className="flex justify-center bg-white rounded-lg p-3 w-fit mx-auto">
              <img src={twoFASetup.qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
            <div className="text-xs text-az-text-muted text-center">
              Or enter manually: <span className="az-mono text-az-text-secondary select-all">{twoFASetup.secret}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={twoFAToken}
                onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, ''))}
                className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)] text-center text-lg tracking-widest"
              />
              <Button
                onClick={() => verify2FA.mutate(twoFAToken)}
                disabled={twoFAToken.length !== 6 || verify2FA.isPending}
                className="bg-emerald-600 hover:bg-[var(--az-emerald)] text-[var(--az-text-primary)]"
              >
                {verify2FA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
          </div>
        )}

        {twoFAStatus?.enabled && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-[var(--az-emerald-soft)] border border-[var(--az-emerald-glow)] rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-[var(--az-emerald)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--az-emerald)]">2FA is active. You'll need a code from your authenticator app when logging in.</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter current token to disable"
                maxLength={6}
                value={twoFADisableToken}
                onChange={(e) => setTwoFADisableToken(e.target.value.replace(/\D/g, ''))}
                className="bg-[var(--az-surface-3)] border-az-border text-[var(--az-text-primary)]"
              />
              <Button
                onClick={() => disable2FA.mutate(twoFADisableToken)}
                disabled={twoFADisableToken.length !== 6 || disable2FA.isPending}
                className="bg-red-600 hover:bg-[var(--az-red)] text-[var(--az-text-primary)]"
              >
                {disable2FA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* KYC Provider note */}
      <div className="bg-[var(--az-surface-2)] border border-az-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[var(--az-violet)]" />
          <h2 className="text-sm font-semibold text-az-text-secondary">KYC Provider</h2>
        </div>
        <p className="text-xs text-az-text-secondary">Currently using manual admin KYC approval. Once Dojah integration is live, approved KYC submissions will be auto-verified and this panel will display the Dojah webhook status and configuration.</p>
        <div className="bg-[var(--az-amber-soft)] border border-[var(--az-amber-soft)] rounded-lg p-3">
          <p className="text-xs text-[var(--az-amber)]">Temporary: Admin manually approves KYC from the Users tab. Hook up Dojah webhook URL once your company registration is complete.</p>
        </div>
      </div>
    </div>
  );
}