// src/pages/Notifications.jsx
// =============================================================================
// Full notification center page (/notifications). Same live feed as the bell
// panel, with status + source filters and the same expandable rows. Mirrors the
// established page layout (header + refresh-less, since the feed auto-refetches).
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications } from '@/lib/useAdminNotifications';
import { Button } from '@/components/forge';
import { Bell, CheckCheck } from 'lucide-react';
import NotificationItem from '@/components/admin/NotificationItem';

const STATUS_FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

const SOURCE_FILTERS = [
  { key: 'ALL', label: 'All sources' },
  { key: 'WITHDRAWAL', label: 'Withdrawals' },
  { key: 'DISPUTE', label: 'Disputes' },
  { key: 'SUSU', label: 'Susu' },
  { key: 'KYC', label: 'KYC' },
  { key: 'VENDOR', label: 'Vendors' },
  { key: 'RESIDENCY', label: 'Residency' },
  { key: 'SYSTEM', label: 'System' },
];

export default function Notifications() {
  const navigate = useNavigate();
  const { open, resolved, all, unreadCount, markRead, markAllRead, isLoading } = useAdminNotifications();
  const [status, setStatus] = useState('open');
  const [source, setSource] = useState('ALL');

  const base = status === 'open' ? open : status === 'resolved' ? resolved : all;
  const list = useMemo(
    () => (source === 'ALL' ? base : base.filter((n) => n.source === source)),
    [base, source],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--f-ok-bg)] rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-[var(--f-ok)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--f-text)]">Notification Center</h1>
            <p className="text-sm text-ink-2">
              {open.length} open
              {unreadCount > 0 && <span className="text-[var(--f-ok)]"> · {unreadCount} unread</span>}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="border-line text-ink-2 hover:bg-[var(--f-surface-sunken)] disabled:opacity-40"
        >
          <CheckCheck className="w-3.5 h-3.5 mr-2" /> Mark all read
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                status === f.key
                  ? 'border-emerald-500 bg-[var(--f-ok-bg)] text-[var(--f-ok)]'
                  : 'border-line text-ink-2 hover:border-line-bright'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setSource(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                source === f.key
                  ? 'border-line bg-line/40 text-[var(--f-text)]'
                  : 'border-line text-ink-3 hover:border-line'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-2 max-w-3xl">
        {isLoading && list.length === 0 && <p className="text-ink-3 text-sm">Loading…</p>}
        {list.map((n) => (
          <NotificationItem key={n.id} n={n} onNavigate={(r) => navigate(r)} onRead={markRead} />
        ))}
        {!isLoading && list.length === 0 && (
          <div className="text-center py-12 text-ink-3 text-sm bg-[var(--f-surface-raised)] border border-line rounded-xl">
            {status === 'open' ? 'No open notifications — all clear ✓' : 'Nothing to show'}
          </div>
        )}
      </div>
    </div>
  );
}
