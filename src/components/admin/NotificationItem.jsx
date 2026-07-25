// src/components/admin/NotificationItem.jsx
// =============================================================================
// Shared expandable notification row used by both the bell panel
// (NotificationCenter) and the full /notifications page. Keeps the rendering of
// a single notification in one place so the two surfaces never drift.
// =============================================================================

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown, ChevronUp, ExternalLink, Wallet, Swords, PiggyBank,
  ShieldCheck, Store, Home, Server, Circle,
} from 'lucide-react';

const SOURCE_META = {
  WITHDRAWAL: { label: 'Withdrawal', icon: Wallet,      color: 'bg-blue-500/20 text-blue-400' },
  DISPUTE:    { label: 'Dispute',    icon: Swords,      color: 'bg-red-500/20 text-red-400' },
  SUSU:       { label: 'Susu',       icon: PiggyBank,   color: 'bg-amber-500/20 text-amber-400' },
  KYC:        { label: 'KYC',        icon: ShieldCheck, color: 'bg-emerald-500/20 text-emerald-400' },
  VENDOR:     { label: 'Vendor',     icon: Store,       color: 'bg-purple-500/20 text-purple-400' },
  RESIDENCY:  { label: 'Residency',  icon: Home,        color: 'bg-emerald-500/20 text-emerald-400' },
  SYSTEM:     { label: 'System',     icon: Server,      color: 'bg-red-500/20 text-red-400' },
};

const SEV_DOT = {
  CRITICAL: 'text-red-500',
  HIGH: 'text-amber-400',
  MEDIUM: 'text-blue-400',
  LOW: 'text-az-text-muted',
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
      <pre className="text-[11px] text-az-text-muted whitespace-pre-wrap break-words">
        {JSON.stringify(raw, null, 2)}
      </pre>
    );
  }
  return (
    <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-[11px] text-az-text-muted">{k}</span>
          <span className="text-[11px] text-az-text-secondary break-words font-mono">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function NotificationItem({ n, onNavigate, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SOURCE_META[n.source] || { label: n.source, icon: Circle, color: 'bg-az-border-bright/30 text-az-text-secondary' };
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
        resolved ? 'border-az-border bg-az-surface/60' : 'border-az-border bg-az-surface'
      } ${!n.read && !resolved ? 'ring-1 ring-emerald-500/20' : ''}`}
    >
      <button
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={`${n.title}${n.read ? '' : ', unread'}`}
        className="w-full text-left p-3 flex items-start gap-3 hover:bg-az-card/40 rounded-xl transition-colors"
      >
        {/* unread dot + source icon */}
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          {!n.read && !resolved && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-az-surface" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Circle className={`w-2 h-2 fill-current ${SEV_DOT[n.severity] || 'text-az-text-muted'}`} />
            <span className="text-sm font-medium text-white truncate">{n.title}</span>
          </div>
          {n.description && (
            <p className="text-xs text-az-text-secondary mt-0.5 truncate">{n.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${meta.color} border-0 text-[10px]`}>{meta.label}</Badge>
            {resolved && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">RESOLVED</Badge>
            )}
            <span className="text-[10px] text-az-text-muted">{fmtTime(n.createdAt)}</span>
          </div>
        </div>

        <span className="text-az-text-muted flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-az-border p-3 space-y-3">
          <RawDetails raw={n.raw} />
          {n.route && (
            <button
              onClick={() => onNavigate?.(n.route)}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              View details <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
