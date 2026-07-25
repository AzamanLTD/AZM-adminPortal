import { useSystemHealth, useStats } from '@/lib/useAdminData';
import PoolBar from '@/components/admin/PoolBar';
import { AlertTriangle, RefreshCw, ArrowUpDown, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function Pools() {
  const { data: health = {}, isLoading, refetch } = useSystemHealth();
  const { data: stats = {} } = useStats();
  const [corpForm, setCorpForm] = useState({ discountRate: '', marketRate: '', usdcAmount: '', fiatSent: '' });
  const [coldForm, setColdForm] = useState({ direction: 'HOT_TO_COLD', amount: '', note: '' });
  const [submitting, setSubmitting] = useState(false);

  const pools = health.pools || {};
  const rate = stats.ghsRate || 12.5;

  const totalSystemUSD =
    (pools.masterCrypto?.balance || 0) +
    (pools.hotWallet?.balance || 0) +
    (pools.fiatPool?.balance || 0) / rate +
    (pools.profitFees?.balance || 0);

  async function submitCorpPurchase(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.warRoom.corporatePurchase({ ...corpForm, source: 'KOTANI' });
      toast.success('Corporate purchase logged');
      setCorpForm({ discountRate: '', marketRate: '', usdcAmount: '', fiatSent: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to log corporate purchase');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitColdStorage(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.warRoom.coldStorage(coldForm);
      toast.success('Cold storage transfer logged');
      setColdForm({ direction: 'HOT_TO_COLD', amount: '', note: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to log cold storage transfer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pool Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">Total system value: <span className="text-emerald-400 font-bold">${totalSystemUSD.toLocaleString()} USD</span></p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
        </Button>
      </div>

      {/* Pool health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PoolBar label="Master Crypto (USDC — Kotani/Cold)" balance={pools.masterCrypto?.balance || 0} currency="USDC" max={100000} status={pools.masterCrypto?.status} />
        <PoolBar label="Hot Wallet (USDC — Tatum)" balance={pools.hotWallet?.balance || 0} currency="USDC" max={20000} status={pools.hotWallet?.status} />
        <PoolBar label="Fiat Pool (MTN MoMo — GHS)" balance={pools.fiatPool?.balance || 0} currency="GHS" max={500000} status={pools.fiatPool?.status} />
        <PoolBar label="Profit & Fees Pool" balance={pools.profitFees?.balance || 0} currency="USD" max={50000} status={pools.profitFees?.status} />
      </div>

      {/* Low pool warning */}
      {pools.fiatPool?.status === 'WARNING' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Fiat Pool Running Low</p>
            <p className="text-xs text-slate-400 mt-1">MTN MoMo fiat pool is below the replenishment threshold. Consider transferring funds from the bank account to the MoMo wallet.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Corporate USDC Purchase (Kotani) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-300">Buy USDC (Kotani Corporate Rate)</h2>
          </div>
          <form onSubmit={submitCorpPurchase} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Corporate Rate (GHS/USD)</label>
                <Input
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                  placeholder="12.20"
                  value={corpForm.discountRate}
                  onChange={(e) => setCorpForm({ ...corpForm, discountRate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Market Rate (GHS/USD)</label>
                <Input
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                  placeholder="12.50"
                  value={corpForm.marketRate}
                  onChange={(e) => setCorpForm({ ...corpForm, marketRate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">USDC Amount</label>
                <Input
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                  placeholder="5000"
                  value={corpForm.usdcAmount}
                  onChange={(e) => setCorpForm({ ...corpForm, usdcAmount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">GHS Sent</label>
                <Input
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                  placeholder="61000"
                  value={corpForm.fiatSent}
                  onChange={(e) => setCorpForm({ ...corpForm, fiatSent: e.target.value })}
                />
              </div>
            </div>
            {corpForm.discountRate && corpForm.marketRate && corpForm.usdcAmount && (
              <div className="bg-slate-800 rounded-lg p-3 text-xs space-y-1">
                <p className="text-slate-400">Savings vs market:</p>
                <p className="text-emerald-400 font-semibold">
                  ₵{((parseFloat(corpForm.marketRate) - parseFloat(corpForm.discountRate)) * parseFloat(corpForm.usdcAmount)).toFixed(2)} GHS saved
                </p>
              </div>
            )}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm" disabled={submitting}>
              {submitting ? 'Logging…' : 'Log Purchase'}
            </Button>
          </form>
        </div>

        {/* Cold Storage Transfer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpDown className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-slate-300">Cold Storage Transfer</h2>
          </div>
          <form onSubmit={submitColdStorage} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Direction</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                value={coldForm.direction}
                onChange={(e) => setColdForm({ ...coldForm, direction: e.target.value })}
              >
                <option value="HOT_TO_COLD">Hot Wallet → Cold Storage</option>
                <option value="COLD_TO_HOT">Cold Storage → Hot Wallet</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">USDC Amount</label>
              <Input
                className="bg-slate-800 border-slate-700 text-white text-sm"
                placeholder="10000"
                value={coldForm.amount}
                onChange={(e) => setColdForm({ ...coldForm, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Note</label>
              <Input
                className="bg-slate-800 border-slate-700 text-white text-sm"
                placeholder="Routine cold storage rotation"
                value={coldForm.note}
                onChange={(e) => setColdForm({ ...coldForm, note: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white text-sm" disabled={submitting}>
              {submitting ? 'Logging…' : 'Log Transfer'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
