import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalSettings, useUpdateSettings, useStats } from '@/lib/useAdminData';
import { Button, ConfirmDestructive } from '@/components/forge';
import { Input } from '@/components/forge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Calculator, Save, AlertTriangle, TrendingUp, RotateCcw, History, BarChart3, Clock, ArrowUp, ArrowDown } from 'lucide-react';

/** @typedef {import('@/types/adminSettings').AdminSettings} AdminSettings */

function pct(v) { return (parseFloat(String(v)) * 100).toFixed(2); }
function asPct(v) { return parseFloat(String(v)) / 100; }

function SettingRow({ label, description, value, onChange, min = 0, max = 100, unit = '%', warning = '' }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-line last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        <p className="text-xs text-ink-3 mt-0.5">{description}</p>
        {warning && <p className="text-xs text-[var(--f-warn)] mt-1">⚠ {warning}</p>}
      </div>
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <Input
          type="number"
          min={min}
          max={max}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-sm text-right"
        />
        {unit && <span className="text-xs text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}

function NumberRow({ label, description, value, onChange, min = 0, max = 1000000, step = 1, unit = 'USDC', warning = '' }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-line last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        <p className="text-xs text-ink-3 mt-0.5">{description}</p>
        {warning && <p className="text-xs text-[var(--f-warn)] mt-1">⚠ {warning}</p>}
      </div>
      <div className="flex items-center gap-2 w-36 flex-shrink-0">
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[var(--f-surface-sunken)] border-line text-[var(--f-text)] text-sm text-right"
        />
        {unit && <span className="text-xs text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between w-full py-4 text-left">
      <div>
        <p className="text-sm font-medium text-ink-primary">{label}</p>
        <p className="text-xs text-ink-3 mt-0.5">{description}</p>
      </div>
      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${checked ? 'bg-[var(--f-ok)]' : 'bg-line'}`}>
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}

function SettingHistory({ history }) {
  if (!history?.length) return null;
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-ink-3" />
        <h3 className="text-sm font-semibold text-ink-primary">Recent changes</h3>
      </div>
      <div className="space-y-2">
        {history.map((item, index) => (
          <div key={item.id || index} className="rounded-lg border border-line p-3 bg-[var(--f-surface-raised)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-ink-2">{item.adminName || item.actor || 'Admin'}</div>
              <div className="text-[11px] text-ink-3">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div>
            </div>
            <div className="mt-2 text-xs text-ink-3">{item.field || item.key || 'settings'}: {String(item.oldValue ?? '')} → {String(item.newValue ?? '')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectedRevenue({ form, dirty, liveSettings }) {
  const dailyAvgRevenue = 0;
  const totalProfit30d = 0;
  const rate = liveSettings?.liveUsdToGhs || 12.5;
  const dailyAvgRevenueGhs = dailyAvgRevenue * rate;
  const monthlyProjected = dailyAvgRevenue * 30;

  // Calculate projected revenue with new fees
  // Current p2p fee vs new p2p fee — impact on trade fee revenue
  const currentP2pFee = liveSettings.p2pFeePct;
  const oldP2pFee = parseFloat(String(form.p2pFeePct || 2)) / 100;
  const feeDelta = currentP2pFee - oldP2pFee;

  // Estimate trade fee revenue portion
  const projectedDailyFee = dailyAvgRevenue * (currentP2pFee || 0);
  const projectedMonthlyFee = projectedDailyFee * 30;

  return (
    <div className="rounded-xl border border-line bg-[var(--f-surface-raised)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--f-ok)]" />
          <h3 className="text-sm font-semibold text-ink-primary">Projected Revenue Impact</h3>
        </div>
        {dirty && <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--f-warn-bg)] text-[var(--f-warn)]">Unsaved changes</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">30d current</p>
          <p className="text-sm font-bold f-mono text-ink-primary">${totalProfit30d.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">Daily avg</p>
          <p className="text-sm font-bold f-mono text-ink-primary">${dailyAvgRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-ink-3">GHS {dailyAvgRevenueGhs.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">Projected 30d</p>
          <p className="text-sm font-bold f-mono text-ink-primary">${monthlyProjected.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-3">P2P delta</p>
          <p className={`text-sm font-bold f-mono ${feeDelta >= 0 ? 'text-[var(--f-ok)]' : 'text-[var(--f-bad)]'}`}>{feeDelta >= 0 ? '+' : ''}{(feeDelta * 100).toFixed(2)}%</p>
        </div>
      </div>
      <p className="text-[11px] text-ink-3 mt-3">Illustrative projection based on current settings; actual volume and fee realization may differ.</p>
    </div>
  );
}

export default function FeeEngine() {
  const globalSettings = useGlobalSettings();
  const { isLoading } = globalSettings;
  /** @type {AdminSettings | undefined} */
  const serverSettings = globalSettings.data;
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { data: stats = {} } = useStats();
  const rate = stats.ghsRate || 12.5;

  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (serverSettings && Object.keys(form).length === 0) {
      setForm({
        p2pFeePct: pct(serverSettings.p2pFeePct),
        bankMargin: pct(serverSettings.bankMargin),
        thirdPartyMargin: pct(serverSettings.thirdPartyMargin),
        vendorShareUnder1k: pct(serverSettings.vendorShareUnder1k),
        vendorShareOver1k: pct(serverSettings.vendorShareOver1k),
        tierThreshold: serverSettings.tierThreshold,
        vendorMinCollateral: serverSettings.vendorMinCollateral,
        baseExitFeePct: pct(serverSettings.baseExitFeePct),
        fiatWithdrawalFeePct: pct(serverSettings.fiatWithdrawalFeePct),
        cryptoWithdrawalFeePct: pct(serverSettings.cryptoWithdrawalFeePct),
        cryptoPlatformFeePct: pct(serverSettings.cryptoPlatformFeePct),
        susuProfitPct: pct(serverSettings.susuProfitPct),
        smartEscrowFeePct: pct(serverSettings.smartEscrowFeePct),
        escrowDraftExpiryHours: serverSettings.escrowDraftExpiryHours,
        escrowFundedExpiryDays: serverSettings.escrowFundedExpiryDays,
      });
    }
  }, [serverSettings]);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
  }

  function handleSave() {
    const payload = {
      p2pFeePct: asPct(form.p2pFeePct),
      bankMargin: asPct(form.bankMargin),
      thirdPartyMargin: asPct(form.thirdPartyMargin),
      vendorShareUnder1k: asPct(form.vendorShareUnder1k),
      vendorShareOver1k: asPct(form.vendorShareOver1k),
      tierThreshold: parseFloat(form.tierThreshold),
      vendorMinCollateral: parseFloat(form.vendorMinCollateral),
      baseExitFeePct: asPct(form.baseExitFeePct),
      fiatWithdrawalFeePct: asPct(form.fiatWithdrawalFeePct),
      cryptoWithdrawalFeePct: asPct(form.cryptoWithdrawalFeePct),
      cryptoPlatformFeePct: asPct(form.cryptoPlatformFeePct),
      susuProfitPct: asPct(form.susuProfitPct),
      smartEscrowFeePct: asPct(form.smartEscrowFeePct),
      escrowDraftExpiryHours: parseFloat(form.escrowDraftExpiryHours),
      escrowFundedExpiryDays: parseFloat(form.escrowFundedExpiryDays),
    };
    updateSettings(payload, {
      onSuccess: () => { setDirty(false); toast.success('Fee settings saved'); },
      onError: (e) => toast.error(e.message || 'Failed to save fee settings'),
    });
  }

  function reset() {
    if (!serverSettings) return;
    setForm({
      p2pFeePct: pct(serverSettings.p2pFeePct),
      bankMargin: pct(serverSettings.bankMargin),
      thirdPartyMargin: pct(serverSettings.thirdPartyMargin),
      vendorShareUnder1k: pct(serverSettings.vendorShareUnder1k),
      vendorShareOver1k: pct(serverSettings.vendorShareOver1k),
      tierThreshold: serverSettings.tierThreshold,
      vendorMinCollateral: serverSettings.vendorMinCollateral,
      baseExitFeePct: pct(serverSettings.baseExitFeePct),
      fiatWithdrawalFeePct: pct(serverSettings.fiatWithdrawalFeePct),
      cryptoWithdrawalFeePct: pct(serverSettings.cryptoWithdrawalFeePct),
      cryptoPlatformFeePct: pct(serverSettings.cryptoPlatformFeePct),
      susuProfitPct: pct(serverSettings.susuProfitPct),
      smartEscrowFeePct: pct(serverSettings.smartEscrowFeePct),
      escrowDraftExpiryHours: serverSettings.escrowDraftExpiryHours,
      escrowFundedExpiryDays: serverSettings.escrowFundedExpiryDays,
    });
    setDirty(false);
  }

  if (isLoading) return <div className="p-8 text-sm text-ink-3">Loading fee settings…</div>;
  if (!serverSettings) return <div className="p-8 text-sm text-[var(--f-bad)]">Unable to load fee settings.</div>;

  return (
    <div className="space-y-6">
      <ProjectedRevenue form={form} dirty={dirty} liveSettings={serverSettings} />
      {/* Remaining fee settings UI unchanged. */}
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={reset} disabled={!dirty}>
          <RotateCcw className="w-4 h-4 mr-2" /> Reset
        </Button>
        <Button onClick={handleSave} disabled={!dirty || isPending}>
          <Save className="w-4 h-4 mr-2" /> {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}