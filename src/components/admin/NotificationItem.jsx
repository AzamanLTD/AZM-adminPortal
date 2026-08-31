// src/components/admin/NotificationItem.jsx
// =============================================================================
// Shared expandable notification row used by both the bell panel
// (NotificationCenter) and the full /notifications page. Keeps the rendering of
// a single notification in one place so the two surfaces never drift.
// =============================================================================

import { useState } from 'react';
import {
  ChevronDown, ChevronUp, ExternalLink, Wallet, Swords, PiggyBank,
  ShieldCheck, Store, Home, Server, Circle,
} from 'lucide-react';
import { Tag } from '@/components/forge';

const SOURCE_META = {
  WITHDRAWAL: { label: 'Withdrawal', icon: Wallet,      color: 'bg-[var(--f-info-bg)] text-[var(--f-info)]' },
  DISPUTE:    { label: 'Dispute',    icon: Swords,      color: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]' },
  SUSU:       { label: 'Susu',       icon: PiggyBank,   color: 'bg-[var(--f-warn-bg)] text-[var(--f-warn)]' },
  KYC:        { label: 'KYC',        icon: ShieldCheck, color: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]' },
  VENDOR:     { label: 'Vendor',     icon: Store,       color: 'bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)]' },
  RESIDENCY:  { label: 'Residency',  icon: Home,        color: 'bg-[var(--f-ok-bg)] text-[var(--f-ok)]' },
  SYSTEM:     { label: 'System',     icon: Server,      color: 'bg-[var(--f-bad-bg)] text-[var(--f-bad)]' },
};

const SEV_DOT = {
  CRITICAL: 'text-[var(--f-bad)]',
  HIGH: 'text-[var(--f-warn)]',
  MEDIUM: 'text-[var(--f-info)]',
  LOW: 'text-ink-3',
};

function fmtTime(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Render the raw object as compact key/value detail rows. Defensive: any source
// whose named fields we didn't anticipate still shows its data here.
function RawDetails({ raw }) {
  if (!raw || typeof raw !== 'object') return null;
  const entries = Object.entries(raw).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== 'object',
  );
  if (entries.length === 0) {
    return (
      <pre className="text-[11px] text-ink-3 whitespace-pre-wrap break-words">
        {JSON.stringify(raw, null, 2)}
      </pre>
    );
  }
  return (
    <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-[11px] text-ink-3">{k}</span>
          <span className="text-[11px] text-ink-2 break-words font-mono">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function NotificationItem({ n, onNavigate, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SOURCE_META[n.source] || { label: n.source, icon: Circle, color: 'bg-line-bright/30 text-ink-2' };
  const Icon = meta.icon;
  const resolved = n.status === 'resolved';

  const toggle = () => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && !n.read) onRead?.(n.id);
  };

  return (
    <div
      className={`rounded-xl border transition-colors ${
        resolved ? 'border-line bg-surface/60' : 'border-line bg-[var(--f-surface-raised)]'
      } ${!n.read && !resolved ? 'ring-1 ring-emerald-500/20' : ''}`}
    >
      <button
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={`${n.title}${n.read ? '' : ', unread'}`}
        className="w-full text-left p-3 flex items-start gap-3 hover:bg-surface/40 rounded-xl transition-colors"
      >
        {/* unread dot + source icon */}
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          {!n.read && !resolved && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ok border-2 border-surface" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Circle className={`w-2 h-2 fill-current ${SEV_DOT[n.severity] || 'text-ink-3'}`} />
            <span className="text-sm font-medium text-[var(--f-text)] truncate">{n.title}</span>
          </div>
          {n.description && (
            <p className="text-xs text-ink-2 mt-0.5 truncate">{n.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Tag className={`${meta.color} border-0 text-[10px]`}>{meta.label}</Tag>
            {resolved && (
              <Tag className="bg-[var(--f-ok-bg)] text-[var(--f-ok)] border-0 text-[10px]">RESOLVED</Tag>
            )}
            <span className="text-[10px] text-ink-3">{fmtTime(n.createdAt)}</span>
          </div>
        </div>

        <span className="text-ink-3 flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line p-3 space-y-3">
          <RawDetails raw={n.raw} />
          {n.route && (
            <button
              onClick={() => onNavigate?.(n.route)}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--f-ok)] hover:text-emerald-300 font-medium"
            >
              View details <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
