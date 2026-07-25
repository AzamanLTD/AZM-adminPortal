import { useState, useEffect } from 'react';
import { useGlobalSettings, useUpdateSettings, useStats } from '@/lib/useAdminData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Calculator, Save, AlertTriangle, TrendingUp, RotateCcw } from 'lucide-react';

function pct(v) { return (parseFloat(v) * 100).toFixed(2); }
function asPct(v) { return parseFloat(v) / 100; }

function SettingRow({ label, description, value, onChange, min = 0, max = 100, unit = '%', warning }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-az-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-az-text-primary">{label}</p>
        <p className="text-xs text-az-text-muted mt-0.5">{description}</p>
        {warning && <p className="text-xs text-amber-400 mt-1">⚠ {warning}</p>}
      </div>
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <Input
          type="number"
          min={min}
          max={max}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-az-card border-az-border text-white text-sm text-right"
        />
        <span className="text-sm text-az-text-secondary">{unit}</span>
      </div>
      <ConfirmDialog
        open={!!removeKey}
        title="Remove Payout Method"
        message={removeKey ? `Remove ${removeKey}? Vendors with this method will need to update their accounts.` : ''}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveMethod}
        onCancel={() => setRemoveKey(null)}
      />
    </div>
  );
}

function P2PCalculator({ settings, rate }) {
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState('3rd_party');

  const threshold = parseFloat(settings.tierThreshold || 1000);
  const isCorp = amount >= threshold;
  const vendorShare = isCorp
    ? parseFloat(settings.vendorShareOver1k || 0.50)
    : parseFloat(settings.vendorShareUnder1k || 0.40);
  const adminShare = 1 - vendorShare;
  const feePct = parseFloat(settings.p2pFeePct || 0.02);
  const marginPct = method === 'bank'
    ? parseFloat(settings.bankMargin || 0.03)
    : parseFloat(settings.thirdPartyMargin || 0.02);

  const platformFee = amount * feePct;
  const adminEarns = platformFee * adminShare;
  const vendorEarns = platformFee * vendorShare;
  const margin = amount * marginPct;
  const totalPlatform = adminEarns + margin;

  return (
    <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-az-text-secondary">P2P Trade Simulator</h3>
        <span className="ml-auto text-xs text-az-text-muted">Live preview</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-az-text-secondary block mb-1">Trade Amount ($)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="bg-az-card border-az-border text-white"
          />
        </div>
        <div>
          <label className="text-xs text-az-text-secondary block mb-1">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full bg-az-card border border-az-border rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="3rd_party">CashApp / PayPal</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>
      </div>

      <div className={`text-xs px-3 py-1.5 rounded-full inline-flex ${isCorp ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
        {isCorp ? `Over $${threshold} — Corporate tier` : `Under $${threshold} — Standard tier`}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Platform Fee Collected', usd: platformFee, color: 'text-emerald-400' },
          { label: `Margin (${(marginPct * 100).toFixed(1)}%)`, usd: margin, color: 'text-blue-400' },
          { label: `Admin Earnings (${(adminShare * 100).toFixed(0)}%)`, usd: adminEarns, color: 'text-purple-400' },
          { label: `Vendor Earnings (${(vendorShare * 100).toFixed(0)}%)`, usd: vendorEarns, color: 'text-amber-400' },
        ].map(({ label, usd, color }) => (
          <div key={label} className="bg-az-card rounded-lg p-3">
            <p className="text-xs text-az-text-muted">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>${usd.toFixed(2)}</p>
            <p className="text-xs text-az-text-muted">GHS {(usd * rate).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex justify-between items-center">
        <span className="text-sm font-medium text-emerald-300">Total Platform Revenue</span>
        <div className="text-right">
          <p className="text-xl font-bold text-emerald-400">${totalPlatform.toFixed(2)}</p>
          <p className="text-xs text-az-text-muted">GHS {(totalPlatform * rate).toFixed(2)}</p>
        </div>
      </div>
      <ConfirmDialog
        open={!!removeKey}
        title="Remove Payout Method"
        message={removeKey ? `Remove ${removeKey}? Vendors with this method will need to update their accounts.` : ''}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveMethod}
        onCancel={() => setRemoveKey(null)}
      />
    </div>
  );
}

function WithdrawalCalculator({ settings, rate }) {
  const [amount, setAmount] = useState(200);
  const [type, setType] = useState('fiat');
  const fiatFee = parseFloat(settings.fiatWithdrawalFeePct || 0.02);
  const cryptoGas = parseFloat(settings.cryptoWithdrawalFeePct || 0.01);
  const cryptoPlatform = parseFloat(settings.cryptoPlatformFeePct || 0.00);
  const feePct = type === 'fiat' ? fiatFee : cryptoGas + cryptoPlatform;
  const feeAmount = amount * feePct;
  const userReceives = amount - feeAmount;

  return (
    <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-az-text-secondary">Withdrawal Simulator</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-az-text-secondary block mb-1">Withdrawal Amount ($)</label>
          <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="bg-az-card border-az-border text-white" />
        </div>
        <div>
          <label className="text-xs text-az-text-secondary block mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-az-card border border-az-border rounded-lg px-3 py-2 text-sm text-white">
            <option value="fiat">Fiat (MTN MoMo)</option>
            <option value="crypto">Crypto (USDC)</option>
          </select>
        </div>
      </div>
      {type === 'crypto' && (
        <div className="bg-az-card rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-az-text-secondary">Gas fee ({(cryptoGas * 100).toFixed(2)}%)</span>
            <span className="text-amber-400">${(amount * cryptoGas).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-az-text-secondary">Platform fee ({(cryptoPlatform * 100).toFixed(2)}%)</span>
            <span className="text-purple-400">${(amount * cryptoPlatform).toFixed(2)}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Fee Rate', value: `${(feePct * 100).toFixed(2)}%`, color: 'text-amber-400' },
          { label: 'Platform Earns', usd: feeAmount, color: 'text-emerald-400' },
          { label: 'User Receives', usd: userReceives, color: 'text-blue-400' },
        ].map(({ label, value, usd, color }) => (
          <div key={label} className="bg-az-card rounded-lg p-3">
            <p className="text-xs text-az-text-muted">{label}</p>
            <p className={`text-base font-bold mt-1 ${color}`}>{value || `$${usd?.toFixed(2)}`}</p>
            {usd !== undefined && <p className="text-xs text-az-text-muted">GHS {(usd * rate).toFixed(2)}</p>}
          </div>
        ))}
      </div>
      {type === 'crypto' && cryptoPlatform === 0 && (
        <p className="text-xs text-amber-400">Platform crypto fee is 0% — you only earn gas. Set a platform fee below if desired.</p>
      )}
      <ConfirmDialog
        open={!!removeKey}
        title="Remove Payout Method"
        message={removeKey ? `Remove ${removeKey}? Vendors with this method will need to update their accounts.` : ''}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveMethod}
        onCancel={() => setRemoveKey(null)}
      />
    </div>
  );
}

export default function FeeEngine() {
  const { data: serverSettings, isLoading } = useGlobalSettings();
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
    };
    updateSettings(payload, {
      onSuccess: () => { toast.success('Settings saved — applies to next transaction immediately'); setDirty(false); },
      onError: (e) => toast.error(e.message),
    });
  }

  const liveSettings = {
    p2pFeePct: asPct(form.p2pFeePct || 2),
    bankMargin: asPct(form.bankMargin || 3),
    thirdPartyMargin: asPct(form.thirdPartyMargin || 2),
    vendorShareUnder1k: asPct(form.vendorShareUnder1k || 40),
    vendorShareOver1k: asPct(form.vendorShareOver1k || 50),
    tierThreshold: form.tierThreshold || 1000,
    fiatWithdrawalFeePct: asPct(form.fiatWithdrawalFeePct || 2),
    cryptoWithdrawalFeePct: asPct(form.cryptoWithdrawalFeePct || 1),
    cryptoPlatformFeePct: asPct(form.cryptoPlatformFeePct || 0),
  };

  const vendorUnder = parseFloat(form.vendorShareUnder1k || 0);
  const vendorOver = parseFloat(form.vendorShareOver1k || 0);

  if (isLoading) return <div className="text-az-text-secondary text-sm p-8 text-center">Loading settings…</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Fee Engine</h1>
          <p className="text-sm text-az-text-secondary mt-1">Every value is fully adjustable. Changes apply to the very next transaction — no restart needed.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setForm({}); setDirty(false); }} className="border-az-border text-az-text-secondary hover:bg-az-card">
            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset
          </Button>
          {dirty && (
            <Button onClick={handleSave} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Save className="w-3.5 h-3.5 mr-2" /> Save Changes
            </Button>
          )}
        </div>
      </div>

      {dirty && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">Unsaved changes — simulators already reflect your new values. Save to apply to live transactions.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* P2P Fees */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-1">P2P Trade Fees</h2>
            <p className="text-xs text-az-text-muted mb-4">Charged to the buyer on every trade completion.</p>
            <SettingRow
              label="Base P2P Fee"
              description="Percentage of trade amount collected as platform fee"
              value={form.p2pFeePct || ''} onChange={(v) => set('p2pFeePct', v)}
              warning={parseFloat(form.p2pFeePct) > 5 ? 'High fee may discourage trades' : undefined}
            />
          </div>

          {/* Revenue Split */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-1">Revenue Split</h2>
            <p className="text-xs text-az-text-muted mb-4">How the platform fee is divided. Admin share = 100% minus Vendor share.</p>
            <SettingRow
              label="Vendor Share (Under Threshold)"
              description={`Trades under $${form.tierThreshold || 1000} — Admin gets ${(100 - vendorUnder).toFixed(2)}%`}
              value={form.vendorShareUnder1k || ''} onChange={(v) => set('vendorShareUnder1k', v)}
              warning={vendorUnder < 30 ? 'Very low vendor share may discourage vendor participation' : undefined}
            />
            <SettingRow
              label="Vendor Share (Over Threshold)"
              description={`Trades at or over $${form.tierThreshold || 1000} — Admin gets ${(100 - vendorOver).toFixed(2)}%`}
              value={form.vendorShareOver1k || ''} onChange={(v) => set('vendorShareOver1k', v)}
            />
            <SettingRow
              label="Tier Threshold"
              description="USD amount above which the higher-value split applies"
              value={form.tierThreshold || ''} onChange={(v) => set('tierThreshold', v)}
              unit="USD" min={0} max={100000}
            />
            <SettingRow
              label="Vendor Min Collateral"
              description="Minimum trading pool balance required for a vendor to post an ad"
              value={form.vendorMinCollateral || ''} onChange={(v) => set('vendorMinCollateral', v)}
              unit="USD" min={0} max={100000}
            />
          </div>

          {/* Margins */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-1">Payment Rail Margins</h2>
            <p className="text-xs text-az-text-muted mb-4">Spread added on top of oracle rate per payment method.</p>
            <SettingRow label="Bank Transfer Margin" description="Applied when payment method is bank transfer" value={form.bankMargin || ''} onChange={(v) => set('bankMargin', v)} />
            <SettingRow label="3rd Party Margin" description="Applied for CashApp, PayPal, and similar" value={form.thirdPartyMargin || ''} onChange={(v) => set('thirdPartyMargin', v)} />
          </div>

          {/* Withdrawal and Exit Fees */}
          <div className="bg-az-surface border border-az-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-1">Withdrawal and Exit Fees</h2>
            <p className="text-xs text-az-text-muted mb-4">Charged when users or vendors withdraw from the platform. All can be set to zero.</p>
            <SettingRow label="Fiat Withdrawal Fee" description="Fee on GHS withdrawals via MTN MoMo" value={form.fiatWithdrawalFeePct || ''} onChange={(v) => set('fiatWithdrawalFeePct', v)} />
            <SettingRow label="Crypto Gas Fee (network cost)" description="Covers blockchain gas — goes to SystemProfitFees" value={form.cryptoWithdrawalFeePct || ''} onChange={(v) => set('cryptoWithdrawalFeePct', v)} />
            <SettingRow
              label="Crypto Platform Fee (additional)"
              description="Extra platform revenue on crypto withdrawals, on top of gas. Set to 0 to charge only gas."
              value={form.cryptoPlatformFeePct || ''} onChange={(v) => set('cryptoPlatformFeePct', v)}
            />
            <SettingRow label="Exit Fee (P2P trade exit)" description="Charged when a user exits an active trade early" value={form.baseExitFeePct || ''} onChange={(v) => set('baseExitFeePct', v)} />
          </div>
        </div>

        {/* Calculators — sticky right column */}
        <div className="space-y-4 lg:sticky lg:top-0 self-start">
          <P2PCalculator settings={liveSettings} rate={rate} />
          <WithdrawalCalculator settings={liveSettings} rate={rate} />
        </div>
      </div>

      {/* Payment Methods Management */}
      <PaymentMethodsManager settings={serverSettings} onSave={(data) => updateSettings(data, { onSuccess: () => toast.success('Payment methods updated'), onError: (e) => toast.error(e.message) })} />
      <ConfirmDialog
        open={!!removeKey}
        title="Remove Payout Method"
        message={removeKey ? `Remove ${removeKey}? Vendors with this method will need to update their accounts.` : ''}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveMethod}
        onCancel={() => setRemoveKey(null)}
      />
    </div>
  );
}


function PaymentMethodsManager({ settings, onSave }) {
  const [methods, setMethods] = useState([]);
  const [fees, setFees] = useState({});
  const [editingMethod, setEditingMethod] = useState(null);
  const [removeKey, setRemoveKey] = useState(null);

  const [newMethod, setNewMethod] = useState(null);

  useEffect(() => {
    if (settings) {
      const m = typeof settings.supportedPaymentMethods === 'string'
        ? JSON.parse(settings.supportedPaymentMethods)
        : (settings.supportedPaymentMethods || []);
      setMethods(m);

      const f = typeof settings.feeByPaymentMethod === 'string'
        ? JSON.parse(settings.feeByPaymentMethod)
        : (settings.feeByPaymentMethod || {});
      setFees(f);
    }
  }, [settings]);

  const riskColors = { LOW: 'text-emerald-400 bg-emerald-500/15', MEDIUM: 'text-amber-400 bg-amber-500/15', HIGH: 'text-red-400 bg-red-500/15' };

  function saveAll(updatedMethods, updatedFees) {
    onSave({
      supportedPaymentMethods: updatedMethods,
      feeByPaymentMethod: updatedFees,
    });
  }

  function handleFeeChange(key, value) {
    const updated = { ...fees, [key]: parseFloat(value) / 100 };
    setFees(updated);
    saveAll(methods, updated);
  }

  function handleRemoveMethod(key) {
    setRemoveKey(key);
  }

  function confirmRemoveMethod() {
    const key = removeKey;
    const updated = methods.filter(m => m.key !== key);
    const updatedFees = { ...fees };
    delete updatedFees[key];
    setMethods(updated);
    setFees(updatedFees);
    saveAll(updated, updatedFees);
    setRemoveKey(null);
  }

  function handleAddMethod() {
    setNewMethod({ key: '', label: '', riskLevel: 'MEDIUM', requiredFields: [{ name: '', label: '', type: 'text', placeholder: '' }] });
  }

  function handleSaveNewMethod() {
    if (!newMethod.key || !newMethod.label) { toast.error('Key and label are required'); return; }
    const key = newMethod.key.toUpperCase().replace(/[\s-]/g, '_');
    const updated = [...methods, { ...newMethod, key }];
    const updatedFees = { ...fees, [key]: 0.02 };
    setMethods(updated);
    setFees(updatedFees);
    setNewMethod(null);
    saveAll(updated, updatedFees);
  }

  return (
    <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Payment Methods & Per-Method Fees</h2>
          <p className="text-xs text-az-text-muted mt-1">Define which payment methods vendors can use and set individual fee rates for each.</p>
        </div>
        <Button size="sm" onClick={handleAddMethod} className="bg-cyan-600 hover:bg-cyan-500 text-white h-8">
          + Add Method
        </Button>
      </div>

      <div className="space-y-2">
        {methods.map((m) => (
          <div key={m.key} className="flex items-center gap-3 bg-az-card rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{m.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${riskColors[m.riskLevel] || riskColors.MEDIUM}`}>{m.riskLevel}</span>
              </div>
              <p className="text-xs text-az-text-muted mt-0.5">
                Fields: {m.requiredFields?.map(f => f.label).join(', ') || 'None'}
              </p>
            </div>
            <div className="flex items-center gap-2 w-24">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={((fees[m.key] || 0) * 100).toFixed(1)}
                onChange={(e) => handleFeeChange(m.key, e.target.value)}
                className="bg-az-border border-az-border-bright text-white text-sm text-right h-8"
              />
              <span className="text-xs text-az-text-secondary">%</span>
            </div>
            <button onClick={() => handleRemoveMethod(m.key)} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
          </div>
        ))}
      </div>

      {newMethod && (
        <div className="bg-az-card border border-cyan-500/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-cyan-400">Add New Payment Method</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-az-text-secondary">Key (e.g. APPLE_PAY)</label>
              <Input value={newMethod.key} onChange={(e) => setNewMethod({ ...newMethod, key: e.target.value })} className="bg-az-border border-az-border-bright text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-az-text-secondary">Display Label</label>
              <Input value={newMethod.label} onChange={(e) => setNewMethod({ ...newMethod, label: e.target.value })} className="bg-az-border border-az-border-bright text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-az-text-secondary">Risk Level</label>
              <select value={newMethod.riskLevel} onChange={(e) => setNewMethod({ ...newMethod, riskLevel: e.target.value })} className="w-full bg-az-border border border-az-border-bright rounded-lg px-3 py-2 text-sm text-white mt-1">
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-az-text-secondary">Required Fields (what vendors must provide)</label>
            {newMethod.requiredFields.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mt-2">
                <Input placeholder="Field name" value={f.name} onChange={(e) => { const rf = [...newMethod.requiredFields]; rf[i] = { ...rf[i], name: e.target.value }; setNewMethod({ ...newMethod, requiredFields: rf }); }} className="bg-az-border border-az-border-bright text-white text-xs" />
                <Input placeholder="Label" value={f.label} onChange={(e) => { const rf = [...newMethod.requiredFields]; rf[i] = { ...rf[i], label: e.target.value }; setNewMethod({ ...newMethod, requiredFields: rf }); }} className="bg-az-border border-az-border-bright text-white text-xs" />
                <select value={f.type} onChange={(e) => { const rf = [...newMethod.requiredFields]; rf[i] = { ...rf[i], type: e.target.value }; setNewMethod({ ...newMethod, requiredFields: rf }); }} className="bg-az-border border border-az-border-bright rounded-lg px-2 text-xs text-white">
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                <Input placeholder="Placeholder" value={f.placeholder} onChange={(e) => { const rf = [...newMethod.requiredFields]; rf[i] = { ...rf[i], placeholder: e.target.value }; setNewMethod({ ...newMethod, requiredFields: rf }); }} className="bg-az-border border-az-border-bright text-white text-xs" />
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setNewMethod({ ...newMethod, requiredFields: [...newMethod.requiredFields, { name: '', label: '', type: 'text', placeholder: '' }] })} className="text-cyan-400 text-xs mt-2">+ Add Field</Button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSaveNewMethod} className="bg-cyan-600 hover:bg-cyan-500 text-white">Save Method</Button>
            <Button size="sm" variant="ghost" onClick={() => setNewMethod(null)} className="text-az-text-secondary">Cancel</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!removeKey}
        title="Remove Payout Method"
        message={removeKey ? `Remove ${removeKey}? Vendors with this method will need to update their accounts.` : ''}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveMethod}
        onCancel={() => setRemoveKey(null)}
      />
    </div>
  );
}
