/**
 * UserDetailDrawer — slide-in panel showing comprehensive user info
 * Phase 3 Admin Portal enhancement
 *
 * Tabs: Overview | Activity | Risk & Actions | Audit Log
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Shield, ShieldCheck, ShieldX, AlertTriangle, DollarSign, Activity, FileText, Clock, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Hash, Mail, Phone, MapPin, Calendar, Award, Zap, Skull } from 'lucide-react';
import { toast } from 'sonner';

const KYC_COLORS = { VERIFIED: 'bg-emerald-500/20 text-emerald-400', PENDING: 'bg-amber-500/20 text-amber-400', REJECTED: 'bg-red-500/20 text-red-400', UNVERIFIED: 'bg-az-text-muted/20 text-az-text-secondary', NONE: 'bg-az-text-muted/20 text-az-text-secondary' };
const RISK_COLORS = { STANDARD: 'bg-az-text-muted/20 text-az-text-secondary', TRUSTED: 'bg-emerald-500/20 text-emerald-400', HIGH_RISK: 'bg-red-500/20 text-red-400' };
const BAN_COLORS = { ACTIVE: 'bg-emerald-500/20 text-emerald-400', BANNED: 'bg-red-500/20 text-red-400', TEMP_BANNED: 'bg-amber-500/20 text-amber-400' };
const TRADE_STATUS_COLORS = { COMPLETED: 'bg-emerald-500/20 text-emerald-400', CANCELLED: 'bg-red-500/20 text-red-400', ESCROWED: 'bg-blue-500/20 text-blue-400', DISPUTED: 'bg-amber-500/20 text-amber-400', PENDING: 'bg-az-text-muted/20 text-az-text-secondary' };
const TX_TYPE_ICONS = { DEPOSIT_CRYPTO: ArrowDownRight, WITHDRAWAL: ArrowUpRight, TRADE_FEE: Zap, ADMIN_CREDIT: DollarSign, REFERRAL_BONUS: Award, PENALTY: Skull };

function fmtUSD(n) {
  if (n == null) return '$0.00';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(d) {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function StatTile({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-az-card rounded-xl p-3 border border-az-border/50">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-3.5 h-3.5 ${color || 'text-az-text-muted'}`} />}
        <span className="text-[10px] uppercase tracking-wide text-az-text-muted">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ListRow({ left, right, status, statusColor }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-az-card/30 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate">{left}</p>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        {right && <span className="text-xs text-az-text-secondary font-mono">{right}</span>}
        {status && <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>{status}</span>}
      </div>
    </div>
  );
}

export default function UserDetailDrawer({ userId, onClose }) {
  const [tab, setTab] = useState('overview');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-detail', userId],
    queryFn: () => api.users.detail(userId),
    enabled: !!userId,
    staleTime: 10000,
  });

  const user = data?.user || {};
  const trades = data?.recentTrades || [];
  const withdrawals = data?.recentWithdrawals || [];
  const transactions = data?.recentTransactions || [];
  const disputes = data?.recentDisputes || [];
  const ads = data?.activeAds || [];
  const actions = data?.recentActions || [];

  const avatar = user.profilePictureUrl
    ? <img src={user.profilePictureUrl} alt="" className="w-full h-full rounded-full object-cover" />
    : <div className="w-full h-full rounded-full bg-az-border flex items-center justify-center text-xl font-bold text-white">{(user.username || '?')[0]?.toUpperCase()}</div>;

  const online = user.isOnline;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-az-surface border-l border-az-border z-50 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-az-surface border-b border-az-border px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  {avatar}
                </div>
                {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-az-surface" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{user.displayName || user.username}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {user.azamanId && <span className="text-xs text-az-text-muted font-mono">{user.azamanId}</span>}
                  <Badge className={`${KYC_COLORS[user.kycStatus] || KYC_COLORS.NONE} border-0 text-[10px]`}>{user.kycStatus || 'NONE'}</Badge>
                  <Badge className={`${BAN_COLORS[user.banStatus] || 'bg-az-text-muted/20 text-az-text-secondary'} border-0 text-[10px]`}>{user.banStatus || 'ACTIVE'}</Badge>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-az-text-muted hover:text-white p-1 rounded-lg hover:bg-az-card/50">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            <Button size="sm" variant="outline" className="border-az-border text-az-text-secondary hover:text-white h-7 text-xs">
              <Mail className="w-3 h-3 mr-1" /> {user.email}
            </Button>
            {user.phoneNumber && (
              <Button size="sm" variant="outline" className="border-az-border text-az-text-secondary h-7 text-xs">
                <Phone className="w-3 h-3 mr-1" /> {user.phoneNumber}
              </Button>
            )}
            {user.country && (
              <Button size="sm" variant="outline" className="border-az-border text-az-text-secondary h-7 text-xs">
                <MapPin className="w-3 h-3 mr-1" /> {user.country}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[100px] bg-az-surface border-b border-az-border px-6 py-2 flex gap-1 z-10">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'activity', label: 'Activity' },
            { id: 'risk', label: 'Risk & Actions' },
            { id: 'audit', label: 'Audit Log' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-az-border text-white' : 'text-az-text-secondary hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-az-border border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && tab === 'overview' && (
            <>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Account</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Role" value={user.role || '—'} icon={Shield} />
                  <StatTile label="Vendor Level" value={user.vendorLevel || '—'} icon={Award} color="text-amber-400" />
                  <StatTile label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} icon={Calendar} />
                  <StatTile label="Last Login" value={timeAgo(user.lastLoginAt)} icon={Clock} color={online ? 'text-emerald-400' : ''} />
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Balances</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Available" value={fmtUSD(user.availableBalance)} icon={DollarSign} color="text-emerald-400" />
                  <StatTile label="Escrow Locked" value={fmtUSD(user.escrowLockedBalance)} icon={ShieldCheck} color="text-amber-400" />
                  <StatTile label="Dispute Escrow" value={fmtUSD(user.disputeEscrowBalance)} icon={AlertTriangle} color="text-red-400" />
                  <StatTile label="AZM Points" value={Number(user.azmBalance || 0).toFixed(0)} icon={Zap} color="text-blue-400" />
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Reputation</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Trades" value={user.tradesCompleted || 0} icon={Activity} />
                  <StatTile label="Completion Rate" value={`${Number(user.completionRate || 0).toFixed(1)}%`} icon={TrendingUp} color="text-emerald-400" />
                  <StatTile label="Positive Reviews" value={user.positiveReviews || 0} icon={TrendingUp} color="text-emerald-400" />
                  <StatTile label="Negative Reviews" value={user.negativeReviews || 0} icon={TrendingDown} color="text-red-400" />
                </div>
              </div>

              {(user.role === 'VENDOR' || user.role === 'ADMIN') && (
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Vendor Performance</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile label="Total Volume" value={fmtUSD(user.totalVolumeUsdc)} icon={Hash} />
                    <StatTile label="Total Profit" value={fmtUSD(user.totalProfitUsdc)} icon={TrendingUp} color="text-emerald-400" />
                    <StatTile label="Current Streak" value={`${user.currentStreak || 0} days`} icon={Zap} color="text-amber-400" />
                    <StatTile label="Best Streak" value={`${user.longestStreak || 0} days`} icon={Award} color="text-amber-400" />
                    <StatTile label="Vendor XP" value={user.vendorXp || 0} icon={Zap} color="text-blue-400" />
                    <StatTile label="Active Ads" value={user._count?.ads || 0} icon={FileText} />
                  </div>
                </div>
              )}

              {ads.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Active Ads ({ads.length})</h3>
                  <div className="space-y-1">
                    {ads.map(a => (
                      <ListRow
                        key={a.id}
                        left={a.title}
                        right={fmtUSD(a.pricePerUsdc)}
                        status={a.type}
                        statusColor="bg-az-text-muted/20 text-az-text-secondary"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!isLoading && tab === 'activity' && (
            <>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Recent Trades ({trades.length})</h3>
                <div className="space-y-1">
                  {trades.map(t => (
                    <ListRow
                      key={t.id}
                      left={`#${t.id} — ${t.adTitle || 'Trade'}`}
                      right={fmtUSD(t.amountUsdc)}
                      status={t.status}
                      statusColor={TRADE_STATUS_COLORS[t.status] || TRADE_STATUS_COLORS.PENDING}
                    />
                  ))}
                  {trades.length === 0 && <p className="text-sm text-az-text-muted text-center py-3">No trades yet</p>}
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Recent Withdrawals ({withdrawals.length})</h3>
                <div className="space-y-1">
                  {withdrawals.map(w => (
                    <ListRow
                      key={w.id}
                      left={w.destinationLabel || w.method || 'Withdrawal'}
                      right={`-${fmtUSD(w.amountUsdc)}`}
                      status={w.status}
                      statusColor={TRADE_STATUS_COLORS[w.status] || TRADE_STATUS_COLORS.PENDING}
                    />
                  ))}
                  {withdrawals.length === 0 && <p className="text-sm text-az-text-muted text-center py-3">No withdrawals yet</p>}
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Recent Transactions ({transactions.length})</h3>
                <div className="space-y-1">
                  {transactions.map(tx => {
                    const Icon = TX_TYPE_ICONS[tx.type] || Hash;
                    return (
                      <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-az-card/30 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-3.5 h-3.5 text-az-text-muted shrink-0" />
                          <span className="text-sm text-white truncate">{tx.type.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-xs text-az-text-secondary font-mono">{fmtUSD(tx.amountUsdc)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TRADE_STATUS_COLORS[tx.status] || 'bg-az-text-muted/20 text-az-text-secondary'}`}>{tx.status}</span>
                        </div>
                      </div>
                    );
                  })}
                  {transactions.length === 0 && <p className="text-sm text-az-text-muted text-center py-3">No transactions yet</p>}
                </div>
              </div>
            </>
          )}

          {!isLoading && tab === 'risk' && (
            <>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Risk Assessment</h3>
                <div className="bg-az-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">Withdrawal Risk Tier</span>
                    <Badge className={`${RISK_COLORS[user.withdrawalRiskTier] || RISK_COLORS.STANDARD} border-0`}>
                      {user.withdrawalRiskTier || 'STANDARD'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">Strikes</span>
                    <span className={`text-sm font-bold ${user.strikeCount > 2 ? 'text-red-400' : 'text-white'}`}>{user.strikeCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">Cancellation Abuse</span>
                    <span className={`text-sm font-bold ${user.cancellationAbuseCount > 3 ? 'text-amber-400' : 'text-white'}`}>{user.cancellationAbuseCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">Completion Rate</span>
                    <span className={`text-sm font-bold ${Number(user.completionRate) < 70 ? 'text-red-400' : Number(user.completionRate) < 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {Number(user.completionRate || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">Ban Status</span>
                    <Badge className={`${BAN_COLORS[user.banStatus] || 'bg-emerald-500/20 text-emerald-400'} border-0`}>
                      {user.banStatus || 'ACTIVE'}{user.banUntil ? ` until ${new Date(user.banUntil).toLocaleDateString()}` : ''}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Recent Disputes ({disputes.length})</h3>
                <div className="space-y-1">
                  {disputes.map(d => (
                    <div key={d.id} className="bg-az-card rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">Dispute #{d.id} (Trade #{d.tradeId})</span>
                        <Badge className={`${d.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} border-0 text-[10px]`}>
                          {d.status}
                        </Badge>
                      </div>
                      {d.reason && <p className="text-xs text-az-text-secondary mt-1">{d.reason}</p>}
                      {d.resolution && <p className="text-xs text-az-text-muted mt-1">Resolution: {d.resolution}</p>}
                    </div>
                  ))}
                  {disputes.length === 0 && <p className="text-sm text-az-text-muted text-center py-3">No disputes</p>}
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Identity Verification</h3>
                <div className="bg-az-card rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">Legal Name</span>
                    <span className="text-sm text-white">{user.legalName || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">ID Type</span>
                    <span className="text-sm text-white">{user.idType || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">ID Number</span>
                    <span className="text-sm text-white font-mono">{user.idNumber ? `****${user.idNumber.slice(-4)}` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-az-text-secondary">Phone Verified</span>
                    <span className={`text-sm ${user.phoneVerified ? 'text-emerald-400' : 'text-az-text-muted'}`}>
                      {user.phoneVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="border-az-border text-az-text-secondary hover:text-white h-8 text-xs"
                    onClick={() => { navigator.clipboard?.writeText(String(user.id)); toast.success('User ID copied'); }}>
                    Copy User ID
                  </Button>
                  <Button size="sm" variant="outline" className="border-az-border text-az-text-secondary hover:text-white h-8 text-xs"
                    onClick={() => { navigator.clipboard?.writeText(user.azamanId || ''); toast.success('Azaman ID copied'); }}>
                    Copy Azaman ID
                  </Button>
                </div>
              </div>
            </>
          )}

          {!isLoading && tab === 'audit' && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-az-text-muted mb-2">Admin Actions on This User ({actions.length})</h3>
              <div className="space-y-1">
                {actions.map(a => (
                  <div key={a.id} className="bg-az-card rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{a.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-az-text-muted">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="text-xs text-az-text-secondary mt-1">By {a.adminName}</p>
                    {a.changes && (
                      <pre className="text-[10px] text-az-text-muted mt-1 overflow-x-auto">
                        {JSON.stringify(a.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {actions.length === 0 && <p className="text-sm text-az-text-muted text-center py-3">No admin actions logged</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
