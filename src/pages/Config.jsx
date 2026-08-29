import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/forge';
import { Input } from '@/components/forge';
import { toast } from 'sonner';
import { Smartphone, Zap, Bot, DollarSign, Shield, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

export default function Config() {
  const qc = useQueryClient();

  const { data: vg, isError: vgError, refetch: refetchVg } = useQuery({ queryKey: ['version-gate'], queryFn: () => api.versionGate.get().catch(() => ({ minVersion: '1.0.0', updateUrl: '', message: '', _error: true })) });
  const { data: po, isError: poError, refetch: refetchPo } = useQuery({ queryKey: ['payout-settings'], queryFn: () => api.payouts.getSettings().catch(() => ({ threshold: 100, maxAmount: 1000, intervalHours: 24, enabled: true, _error: true })) });
  const { data: gs, isError: gsError, refetch: refetchGs } = useQuery({ queryKey: ['global-settings'], queryFn: () => api.settings.get().catch(() => ({ settings: { susuProfitPct: 0.03, liveUsdToGhs: 15.2, liveRateSource: 'AZM_ADMIN_MOCK' }, _error: true })) });

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
  const updateGs = useMutation({ mutationFn: (d) => api.settings.update(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['global-settings'] }); toast.success('Global settings updated'); } });
  const batchProcess = useMutation({ mutationFn: () => api.payouts.batchProcess(), onSuccess: () => toast.success('Payout batch triggered') });

  const vgData = { ...vg, ...vgForm };
  const poData = { ...po, ...poForm };
  const gsData = { ...(gs?.settings || {}), ...gsForm };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--f-text)]">System Configuration</h1>
        <p className="text-sm text-ink-2 mt-1">App version gate, payout automation, exchange-rate controls, and system security.</p>
      </div>

      {hasAnyError && (
        <div className="bg-[var(--f-warn-bg)] border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 text-sm">
          <span className="text-[var(--f-warn)]">⚠ Some settings failed to load. Values shown may be defaults.</span>
          <div className="flex gap-2 ml-auto">
            {vgError && <Button variant="ghost" size="sm" onClick={refetchVg} className="h-7 text-xs">Retry VG</Button>}
            {poError && <Button variant="ghost" size="sm" onClick={refetchPo} className="h-7 text-xs">Retry PO</Button>}
            {gsError && <Button variant="ghost" size="sm" onClick={refetchGs} className="h-7 text-xs">Retry GS</Button>}
          </div>
        </div>
      )}

      {/* Version Gate */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[var(--f-info)]" />
          <h2 className="text-sm font-semibold text-ink-2">App Version Gate</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-2 block mb-1">Minimum Version</label>
            <Input value={vgData.minVersion || ''} onChange={(e) => setVgForm((f) => ({ ...f, minVersion: e.target.value }))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" placeholder="1.2.0" />
          </div>
          <div>
            <label className="text-xs text-ink-2 block mb-1">Update URL</label>
            <Input value={vgData.updateUrl || ''} onChange={(e) => setVgForm((f) => ({ ...f, updateUrl: e.target.value }))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" placeholder="https://play.google.com/..." />
          </div>
        </div>
        <div>
          <label className="text-xs text-ink-2 block mb-1">Update Message</label>
          <Input value={vgData.message || ''} onChange={(e) => setVgForm((f) => ({ ...f, message: e.target.value }))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" placeholder="Please update to continue using the app." />
        </div>
        <Button onClick={() => updateVg.mutate(vgData)} className="bg-blue-600 hover:bg-[var(--f-info)] text-[var(--f-text)]">
          Save Version Gate
        </Button>
      </div>

      {/* Payout Automation */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--f-ok)]" />
          <h2 className="text-sm font-semibold text-ink-2">Autonomous Payout Settings</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-2 block mb-1">Auto-payout Threshold ($)</label>
            <Input type="number" value={poData.threshold || ''} onChange={(e) => setPoForm((f) => ({ ...f, threshold: parseFloat(e.target.value) }))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
          </div>
          <div>
            <label className="text-xs text-ink-2 block mb-1">Max Amount per Payout ($)</label>
            <Input type="number" value={poData.maxAmount || ''} onChange={(e) => setPoForm((f) => ({ ...f, maxAmount: parseFloat(e.target.value) }))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
          </div>
          <div>
            <label className="text-xs text-ink-2 block mb-1">Interval (hours)</label>
            <Input type="number" value={poData.intervalHours || ''} onChange={(e) => setPoForm((f) => ({ ...f, intervalHours: parseInt(e.target.value) }))} className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]" />
          </div>
          <div>
            <label className="text-xs text-ink-2 block mb-1">Enabled</label>
            <select value={poData.enabled ? 'true' : 'false'} onChange={(e) => setPoForm((f) => ({ ...f, enabled: e.target.value === 'true' }))} className="w-full bg-[var(--f-surface-sunken)] border border-line rounded-lg px-3 py-2 text-sm text-[var(--f-text)]">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => updatePo.mutate(poData)} className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]">
            Save Payout Settings
          </Button>
          <Button variant="outline" onClick={() => batchProcess.mutate()} className="border-line text-ink-2 hover:bg-[var(--f-surface-sunken)]">
            Trigger Batch Now
          </Button>
        </div>
      </div>

      {/* Mock KotaniPay / USDC-GHS Rate */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[var(--f-info)]" />
            <h2 className="text-sm font-semibold text-ink-2">USDC / GHS Conversion Rate</h2>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-[var(--f-info)] bg-[var(--f-info-bg)] px-2 py-1 rounded-full">
            {gsData.liveRateSource || 'AZM_ADMIN_MOCK'}
          </span>
        </div>
        <p className="text-xs text-ink-2">
          Temporary administrator-controlled rate used as the mock KotaniPay source. Existing transaction quotes keep their issued rate until expiry; new quotes use the latest saved rate.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-2 block mb-1">GHS per 1 USDC</label>
            <Input
              type="number"
              step="0.0001"
              min="0.000001"
              value={gsData.liveUsdToGhs ?? ''}
              onChange={(e) => setGsForm((f) => ({ ...f, liveUsdToGhs: parseFloat(e.target.value) }))}
              className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]"
              placeholder="15.20"
            />
          </div>
          <div>
            <label className="text-xs text-ink-2 block mb-1">Rate Source</label>
            <select
              value={gsData.liveRateSource || 'AZM_ADMIN_MOCK'}
              onChange={(e) => setGsForm((f) => ({ ...f, liveRateSource: e.target.value }))}
              className="w-full bg-[var(--f-surface-sunken)] border border-line rounded-lg px-3 py-2 text-sm text-[var(--f-text)]"
            >
              <option value="AZM_ADMIN_MOCK">AZM Admin Mock</option>
              <option value="KOTANI_PAY">KotaniPay</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-line bg-[var(--f-surface-sunken)] p-3">
            <span className="text-ink-3 block mb-1">Current conversion</span>
            <strong className="text-[var(--f-text)]">1 USDC ≈ GHS {Number(gsData.liveUsdToGhs || 0).toFixed(4)}</strong>
          </div>
          <div className="rounded-lg border border-line bg-[var(--f-surface-sunken)] p-3">
            <span className="text-ink-3 block mb-1">Last synchronized</span>
            <strong className="text-[var(--f-text)]">{gsData.lastRateSync ? new Date(gsData.lastRateSync).toLocaleString() : 'Not synchronized'}</strong>
          </div>
        </div>
        <Button
          onClick={() => updateGs.mutate({
            liveUsdToGhs: gsData.liveUsdToGhs,
            liveRateSource: gsData.liveRateSource || 'AZM_ADMIN_MOCK',
          })}
          disabled={!Number.isFinite(Number(gsData.liveUsdToGhs)) || Number(gsData.liveUsdToGhs) <= 0 || updateGs.isPending}
          className="bg-blue-600 hover:bg-[var(--f-info)] text-[var(--f-text)]"
        >
          {updateGs.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Save Conversion Rate
        </Button>
      </div>

      {/* Phase 5: Susu Profit Percentage */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--f-warn)]" />
          <h2 className="text-sm font-semibold text-ink-2">Susu Platform Fee</h2>
        </div>
        <p className="text-xs text-ink-2">
          The platform fee percentage deducted from each Susu cycle payout. Default is 3% (0.03).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-2 block mb-1">Profit Percentage (0-1)</label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={gsData.susuProfitPct ?? 0.03}
              onChange={(e) => setGsForm((f) => ({ ...f, susuProfitPct: parseFloat(e.target.value) }))}
              className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]"
              placeholder="0.03"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-[var(--f-warn-bg)] border border-[var(--f-warn-bg)] rounded-lg p-3 w-full">
              <p className="text-xs text-[var(--f-warn)] font-semibold">
                Current: {((gsData.susuProfitPct ?? 0.03) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => updateGs.mutate({ susuProfitPct: gsData.susuProfitPct })} className="bg-amber-600 hover:bg-[var(--f-warn)] text-[var(--f-text)]">
          Save Susu Fee
        </Button>
      </div>

      {/* 2FA Security */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--f-ok)]" />
            <h2 className="text-sm font-semibold text-ink-2">Two-Factor Authentication (TOTP)</h2>
          </div>
          {twoFAStatus?.enabled && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--f-ok)] bg-[var(--f-ok-bg)] px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-2.5 h-2.5" /> Enabled
            </span>
          )}
        </div>

        {!twoFAStatus?.enabled && !twoFASetup && (
          <div className="space-y-3">
            <p className="text-xs text-ink-2">Add an extra layer of security to your admin account using a TOTP authenticator app (Google Authenticator, Authy, etc.).</p>
            <Button onClick={() => setup2FA.mutate()} disabled={setup2FA.isPending} className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]">
              {setup2FA.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Setup 2FA
            </Button>
          </div>
        )}

        {twoFASetup && (
          <div className="space-y-3">
            <p className="text-xs text-ink-2">Scan this QR code with your authenticator app, then enter the 6-digit code below.</p>
            <div className="flex justify-center bg-white rounded-lg p-3 w-fit mx-auto">
              <img src={twoFASetup.qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
            <div className="text-xs text-ink-3 text-center">
              Or enter manually: <span className="f-mono text-ink-2 select-all">{twoFASetup.secret}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={twoFAToken}
                onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, ''))}
                className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-center text-lg tracking-widest"
              />
              <Button
                onClick={() => verify2FA.mutate(twoFAToken)}
                disabled={twoFAToken.length !== 6 || verify2FA.isPending}
                className="bg-emerald-600 hover:bg-[var(--f-ok)] text-[var(--f-text)]"
              >
                {verify2FA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
          </div>
        )}

        {twoFAStatus?.enabled && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-[var(--f-ok-bg)] border border-[var(--f-ok)] rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-[var(--f-ok)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--f-ok)]">2FA is active. You'll need a code from your authenticator app when logging in.</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter current token to disable"
                maxLength={6}
                value={twoFADisableToken}
                onChange={(e) => setTwoFADisableToken(e.target.value.replace(/\D/g, ''))}
                className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)]"
              />
              <Button
                onClick={() => disable2FA.mutate(twoFADisableToken)}
                disabled={twoFADisableToken.length !== 6 || disable2FA.isPending}
                className="bg-red-600 hover:bg-[var(--f-bad)] text-[var(--f-text)]"
              >
                {disable2FA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* KYC Provider note */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[var(--f-tint-color)]" />
          <h2 className="text-sm font-semibold text-ink-2">KYC Provider</h2>
        </div>
        <p className="text-xs text-ink-2">Currently using manual admin KYC approval. Once Dojah integration is live, approved KYC submissions will be auto-verified and this panel will display the Dojah webhook status and configuration.</p>
        <div className="bg-[var(--f-warn-bg)] border border-[var(--f-warn-bg)] rounded-lg p-3">
          <p className="text-xs text-[var(--f-warn)]">Temporary: Admin manually approves KYC from the Users tab. Hook up Dojah webhook URL once your company registration is complete.</p>
        </div>
      </div>
    </div>
  );
}
