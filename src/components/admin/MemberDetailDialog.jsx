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
  VERIFIED: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]',
  PENDING: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]',
  REJECTED: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]',
  UNVERIFIED: 'bg-line-bright/30 text-ink-2',
};
const POR_COLORS = {
  VERIFIED: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]',
  PENDING_REVIEW: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]',
  REJECTED: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]',
  EXPIRED: 'bg-orange-500/20 text-orange-400',
  NOT_SUBMITTED: 'bg-line-bright/30 text-ink-2',
};

function Stat({ label, value, color = 'text-[var(--f-text)]' }) {
  return (
    <div className="bg-surface/50 rounded-lg px-3 py-2">
      <p className="text-[11px] text-ink-3 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, count, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-ink-2" />
        <h4 className="text-xs font-semibold text-ink-2 uppercase tracking-wide">{title}</h4>
        {count != null && <span className="text-xs text-ink-3">({count})</span>}
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
      <DialogContent className="bg-[var(--f-surface-raised)] border-line text-ink-primary max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-[var(--f-ok)]" />
            Member Detail
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-ink-3 text-sm py-6 text-center">Loading…</p>}

        {u && (
          <div className="space-y-5">
            {/* Identity */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--f-ok-bg)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {u.avatar
                  ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[var(--f-ok)] font-bold">{(u.username || '?').slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-[var(--f-text)]">{u.displayName || u.username}</p>
                <p className="text-xs text-ink-3">@{u.username} · {u.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Tag className={`${KYC_COLORS[u.kycStatus] || KYC_COLORS.UNVERIFIED} border-0 text-xs`}>
                    KYC {u.kycStatus}
                  </Tag>
                  <Tag className={`${POR_COLORS[u.proofOfResidencyStatus] || POR_COLORS.NOT_SUBMITTED} border-0 text-xs`}>
                    PoR {u.proofOfResidencyStatus?.replace('_', ' ')}
                  </Tag>
                  {u.banStatus && u.banStatus !== 'ACTIVE' && (
                    <Tag className="bg-[var(--f-bad-bg)] text-[var(--f-bad)] border-0 text-xs">{u.banStatus}</Tag>
                  )}
                </div>
              </div>
            </div>

            {/* Decrypted identity card */}
            <div className="bg-bg border border-[var(--f-warn-bg)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-[var(--f-warn)]" />
                <span className="text-xs font-semibold text-[var(--f-warn)] uppercase tracking-wide">
                  Authorized Identity View (Decrypted)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Legal Name" value={u.legalName || '—'} />
                <Stat label="ID Type" value={u.idType || '—'} />
                <div className="col-span-2 bg-surface/50 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-ink-3 uppercase tracking-wide">ID Number</p>
                  <p className="text-sm font-mono font-semibold text-amber-300">
                    {u.idNumber || (u.idNumberOnFile ? '⚠ on file (decryption unavailable)' : '—')}
                  </p>
                </div>
              </div>
              {(u.idImageFront || u.idImageBack) && (
                <div className="flex gap-2">
                  {u.idImageFront && (
                    <a href={u.idImageFront} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg border border-line text-ink-2 hover:bg-[var(--f-surface-sunken)]">
                      ID Front
                    </a>
                  )}
                  {u.idImageBack && (
                    <a href={u.idImageBack} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg border border-line text-ink-2 hover:bg-[var(--f-surface-sunken)]">
                      ID Back
                    </a>
                  )}
                  {u.proofOfResidencyUrl && (
                    <a href={u.proofOfResidencyUrl} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-1.5 rounded-lg border border-line text-ink-2 hover:bg-[var(--f-surface-sunken)]">
                      Residency Doc
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Risk stats */}
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Trust Rating" value={u.trustRating ?? '—'}
                color={u.trustRating >= 80 ? 'text-[var(--f-ok)]' : u.trustRating >= 40 ? 'text-[var(--f-warn)]' : 'text-[var(--f-bad)]'} />
              <Stat label="Strikes" value={u.strikeCount ?? 0} color={u.strikeCount > 0 ? 'text-[var(--f-bad)]' : 'text-[var(--f-text)]'} />
              <Stat label="Defaults" value={h?.defaultCount ?? 0} color={h?.defaultCount > 0 ? 'text-[var(--f-bad)]' : 'text-[var(--f-text)]'} />
              <Stat label="AZM" value={Number(u.azmBalance || 0).toFixed(0)} />
            </div>

            {/* Susu memberships */}
            <Section icon={FileText} title="Susu Memberships" count={h?.memberships?.length}>
              <div className="space-y-1.5">
                {(h?.memberships || []).map((m) => (
                  <div key={m.susuMemberId} className="flex items-center justify-between bg-surface/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-ink-2 truncate">{m.susuName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Tag className="bg-line text-ink-2 border-0 text-[10px]">slot {m.payoutSlot ?? '—'}</Tag>
                      <Tag className={`border-0 text-[10px] ${m.memberStatus === 'DEFAULTED' ? 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]' : m.memberStatus === 'ACTIVE' ? 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]' : 'bg-line text-ink-2'}`}>
                        {m.memberStatus}
                      </Tag>
                    </div>
                  </div>
                ))}
                {(!h?.memberships || h.memberships.length === 0) && <p className="text-xs text-ink-3">No memberships</p>}
              </div>
            </Section>

            {/* Seizures */}
            <Section icon={AlertTriangle} title="Seizures" count={h?.seizures?.length}>
              <div className="space-y-1.5">
                {(h?.seizures || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-surface/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-[var(--f-bad)] font-medium">−${Number(s.seizedFromAvailable).toFixed(2)}</span>
                    <span className="text-ink-3">shortfall ${Number(s.shortfall).toFixed(2)}</span>
                    <span className="text-ink-3">{new Date(s.at).toLocaleDateString()}</span>
                  </div>
                ))}
                {(!h?.seizures || h.seizures.length === 0) && <p className="text-xs text-ink-3">No seizures</p>}
              </div>
            </Section>

            {/* Voucher slashes received (their voucher got slashed for this user's default) */}
            <Section icon={TrendingDown} title="Voucher Slashes Triggered (by this member's defaults)" count={h?.slashesReceived?.length}>
              <div className="space-y-1.5">
                {(h?.slashesReceived || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-surface/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-ink-2">voucher #{s.voucherId ?? '—'}</span>
                    <span className="text-[var(--f-bad)] font-medium">−{Number(s.azmDeducted).toFixed(0)} AZM</span>
                    <span className="text-ink-3">{new Date(s.at).toLocaleDateString()}</span>
                  </div>
                ))}
                {(!h?.slashesReceived || h.slashesReceived.length === 0) && <p className="text-xs text-ink-3">None</p>}
              </div>
            </Section>

            {/* Slashes issued (this user vouched someone who defaulted) */}
            <Section icon={Hand} title="Penalties Taken as Voucher (their invitees defaulted)" count={h?.slashesIssued?.length}>
              <div className="space-y-1.5">
                {(h?.slashesIssued || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-surface/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-ink-2">invitee #{s.vouchedUserId}</span>
                    <span className="text-[var(--f-bad)] font-medium">−{Number(s.azmDeducted).toFixed(0)} AZM</span>
                    <span className="text-ink-3">trust {s.trustRatingBefore}→{s.trustRatingAfter}</span>
                  </div>
                ))}
                {(!h?.slashesIssued || h.slashesIssued.length === 0) && <p className="text-xs text-ink-3">None</p>}
              </div>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
