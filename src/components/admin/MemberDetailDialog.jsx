import { useSusuMember } from '@/lib/useAdminData';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Fingerprint, AlertTriangle,
  TrendingDown, Hand, FileText, Eye,
} from 'lucide-react';

const KYC_COLORS = {
  VERIFIED: 'bg-emerald-500/20 text-emerald-400',
  PENDING: 'bg-amber-500/20 text-amber-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  UNVERIFIED: 'bg-az-border-bright/30 text-az-text-secondary',
};
const POR_COLORS = {
  VERIFIED: 'bg-emerald-500/20 text-emerald-400',
  PENDING_REVIEW: 'bg-amber-500/20 text-amber-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  EXPIRED: 'bg-orange-500/20 text-orange-400',
  NOT_SUBMITTED: 'bg-az-border-bright/30 text-az-text-secondary',
};

function Stat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-az-card/50 rounded-lg px-3 py-2">
      <p className="text-[11px] text-az-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, count, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-az-text-secondary" />
        <h4 className="text-xs font-semibold text-az-text-secondary uppercase tracking-wide">{title}</h4>
        {count != null && <span className="text-xs text-az-text-muted">({count})</span>}
      </div>
      {children}
    </div>
  );
}

export default function MemberDetailDialog({ userId, open, onOpenChange }) {
  const { data, isLoading } = useSusuMember(open ? userId : null);
  const u = data?.user;
  const h = data?.history;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-az-surface border-az-border text-az-text-primary max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            Member Detail
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-az-text-muted text-sm py-6 text-center">Loading…</p>}

        {u && (
          <div className="space-y-5">
            {/* Identity */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {u.avatar
                  ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-emerald-400 font-bold">{(u.username || '?').slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white">{u.displayName || u.username}</p>
                <p className="text-xs text-az-text-muted">@{u.username} · {u.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge className={`${KYC_COLORS[u.kycStatus] || KYC_COLORS.UNVERIFIED} border-0 text-xs`}>
                    KYC {u.kycStatus}
                  </Badge>
                  <Badge className={`${POR_COLORS[u.proofOfResidencyStatus] || POR_COLORS.NOT_SUBMITTED} border-0 text-xs`}>
                    PoR {u.proofOfResidencyStatus?.replace('_', ' ')}
                  </Badge>
                  {u.banStatus && u.banStatus !== 'ACTIVE' && (
                    <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">{u.banStatus}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Decrypted identity card */}
            <div className="bg-az-black border border-amber-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Authorized Identity View (Decrypted)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Legal Name" value={u.legalName || '—'} />
                <Stat label="ID Type" value={u.idType || '—'} />
                <div className="col-span-2 bg-az-card/50 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-az-text-muted uppercase tracking-wide">ID Number</p>
                  <p className="text-sm font-mono font-semibold text-amber-300">
                    {u.idNumber || (u.idNumberOnFile ? '⚠ on file (decryption unavailable)' : '—')}
                  </p>
                </div>
              </div>
              {(u.idImageFront || u.idImageBack) && (
                <div className="flex gap-2">
                  {u.idImageFront && (
                    <a href={u.idImageFront} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg border border-az-border text-az-text-secondary hover:bg-az-card">
                      ID Front
                    </a>
                  )}
                  {u.idImageBack && (
                    <a href={u.idImageBack} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg border border-az-border text-az-text-secondary hover:bg-az-card">
                      ID Back
                    </a>
                  )}
                  {u.proofOfResidencyUrl && (
                    <a href={u.proofOfResidencyUrl} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg border border-az-border text-az-text-secondary hover:bg-az-card">
                      Residency Doc
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Risk stats */}
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Trust Rating" value={u.trustRating ?? '—'}
                color={u.trustRating >= 80 ? 'text-emerald-400' : u.trustRating >= 40 ? 'text-amber-400' : 'text-red-400'} />
              <Stat label="Strikes" value={u.strikeCount ?? 0} color={u.strikeCount > 0 ? 'text-red-400' : 'text-white'} />
              <Stat label="Defaults" value={h?.defaultCount ?? 0} color={h?.defaultCount > 0 ? 'text-red-400' : 'text-white'} />
              <Stat label="AZM" value={Number(u.azmBalance || 0).toFixed(0)} />
            </div>

            {/* Susu memberships */}
            <Section icon={FileText} title="Susu Memberships" count={h?.memberships?.length}>
              <div className="space-y-1.5">
                {(h?.memberships || []).map((m) => (
                  <div key={m.susuMemberId} className="flex items-center justify-between bg-az-card/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-az-text-secondary truncate">{m.susuName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className="bg-az-border text-az-text-secondary border-0 text-[10px]">slot {m.payoutSlot ?? '—'}</Badge>
                      <Badge className={`border-0 text-[10px] ${m.memberStatus === 'DEFAULTED' ? 'bg-red-500/20 text-red-400' : m.memberStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-az-border text-az-text-secondary'}`}>
                        {m.memberStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!h?.memberships || h.memberships.length === 0) && <p className="text-xs text-az-text-muted">No memberships</p>}
              </div>
            </Section>

            {/* Seizures */}
            <Section icon={AlertTriangle} title="Seizures" count={h?.seizures?.length}>
              <div className="space-y-1.5">
                {(h?.seizures || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-az-card/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-red-400 font-medium">−${Number(s.seizedFromAvailable).toFixed(2)}</span>
                    <span className="text-az-text-muted">shortfall ${Number(s.shortfall).toFixed(2)}</span>
                    <span className="text-az-text-muted">{new Date(s.at).toLocaleDateString()}</span>
                  </div>
                ))}
                {(!h?.seizures || h.seizures.length === 0) && <p className="text-xs text-az-text-muted">No seizures</p>}
              </div>
            </Section>

            {/* Voucher slashes received (their voucher got slashed for this user's default) */}
            <Section icon={TrendingDown} title="Voucher Slashes Triggered (by this member's defaults)" count={h?.slashesReceived?.length}>
              <div className="space-y-1.5">
                {(h?.slashesReceived || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-az-card/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-az-text-secondary">voucher #{s.voucherId ?? '—'}</span>
                    <span className="text-red-400 font-medium">−{Number(s.azmDeducted).toFixed(0)} AZM</span>
                    <span className="text-az-text-muted">{new Date(s.at).toLocaleDateString()}</span>
                  </div>
                ))}
                {(!h?.slashesReceived || h.slashesReceived.length === 0) && <p className="text-xs text-az-text-muted">None</p>}
              </div>
            </Section>

            {/* Slashes issued (this user vouched someone who defaulted) */}
            <Section icon={Hand} title="Penalties Taken as Voucher (their invitees defaulted)" count={h?.slashesIssued?.length}>
              <div className="space-y-1.5">
                {(h?.slashesIssued || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-az-card/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-az-text-secondary">invitee #{s.vouchedUserId}</span>
                    <span className="text-red-400 font-medium">−{Number(s.azmDeducted).toFixed(0)} AZM</span>
                    <span className="text-az-text-muted">trust {s.trustRatingBefore}→{s.trustRatingAfter}</span>
                  </div>
                ))}
                {(!h?.slashesIssued || h.slashesIssued.length === 0) && <p className="text-xs text-az-text-muted">None</p>}
              </div>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
