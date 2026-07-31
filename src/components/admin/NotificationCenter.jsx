// src/components/admin/NotificationCenter.jsx
// =============================================================================
// Bell slide-over for the admin topbar. Shows the live notification feed with
// Open / Resolved / All tabs, an unread badge, "mark all read", and rows that
// expand for detail and route to the relevant page.
//
// Controlled by Layout.jsx (open state + the bell trigger). The aggregator hook
// is the single source of truth; this is pure presentation + navigation.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCheck, Inbox } from 'lucide-react';
import NotificationItem from './NotificationItem';

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export default function NotificationCenter({ open, onOpenChange, notifications }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('open');
  const { open: openItems, resolved, all, unreadCount, markRead, markAllRead, isLoading } = notifications;

  const list = tab === 'open' ? openItems : tab === 'resolved' ? resolved : all;

  const go = (route) => {
    onOpenChange(false);
    navigate(route);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-az-black border-az-border text-az-text-primary w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b border-az-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-[var(--az-text-primary)] flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--az-emerald-soft)] text-[var(--az-emerald)]">
                  {unreadCount} new
                </span>
              )}
            </SheetTitle>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              aria-label="Mark all notifications as read"
              className="text-xs text-az-text-secondary hover:text-[var(--az-emerald)] disabled:opacity-40 disabled:hover:text-az-text-secondary inline-flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-3">
            {TABS.map((t) => {
              const count = t.key === 'open' ? openItems.length : t.key === 'resolved' ? resolved.length : all.length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    tab === t.key
                      ? 'border-emerald-500 bg-[var(--az-emerald-soft)] text-[var(--az-emerald)]'
                      : 'border-az-border text-az-text-secondary hover:border-az-border-bright'
                  }`}
                >
                  {t.label} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {isLoading && list.length === 0 && (
              <p className="text-az-text-muted text-sm text-center py-8">Loading…</p>
            )}
            {list.map((n) => (
              <NotificationItem key={n.id} n={n} onNavigate={go} onRead={markRead} />
            ))}
            {!isLoading && list.length === 0 && (
              <div className="text-center py-12 text-az-text-muted">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {tab === 'open' ? 'No open items — all clear' : tab === 'resolved' ? 'No resolved items' : 'Nothing here'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
