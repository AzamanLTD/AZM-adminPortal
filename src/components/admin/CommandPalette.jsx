/**
 * Command Palette (⌘K / Ctrl+K)
 *
 * Global keyboard-driven navigation overlay. Opens with Cmd+K (macOS) or Ctrl+K (others).
 * Fuzzy-filters all admin pages and quick actions. Arrow keys navigate, Enter selects, Esc closes.
 *
 * Reference: Linear (command palette), Raycast, Vercel dashboard.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, CornerDownLeft, ArrowUp, ArrowDown,
  LayoutDashboard, Swords, Users, TrendingUp, Wallet,
  Sliders, FileText, Shield, Database, Zap, Bot,
  PiggyBank, Siren, Home, Building2, Lock, FileCheck, QrCode,
  Store, Settings, RefreshCw,
} from 'lucide-react';

const COMMANDS = [
  { label: 'Command Center', icon: LayoutDashboard, to: '/', hint: 'Dashboard overview' },
  { label: 'War Room', icon: Swords, to: '/war-room', hint: 'Dispute resolution' },
  { label: 'Escrow Disputes', icon: Lock, to: '/escrow-disputes', hint: 'Escrow dispute management' },
  { label: 'Susu Groups', icon: PiggyBank, to: '/susu', hint: 'View all Susu groups' },
  { label: 'Susu Incidents', icon: Siren, to: '/susu-incidents', hint: 'Active Susu alerts' },
  { label: 'Residency Queue', icon: Home, to: '/residency-queue', hint: 'Proof of residency reviews' },
  { label: 'Business KYB', icon: FileCheck, to: '/business-kyb', hint: 'KYB verification queue' },
  { label: 'Notifications', icon: Shield, to: '/notifications', hint: 'All notifications' },
  { label: 'Revenue & Profits', icon: TrendingUp, to: '/profits', hint: 'Profit breakdown' },
  { label: 'Pool Monitor', icon: Database, to: '/pools', hint: 'System pool balances' },
  { label: 'Users & KYC', icon: Users, to: '/users', hint: 'User management' },
  { label: 'Businesses', icon: Building2, to: '/businesses', hint: 'All businesses' },
  { label: 'Storefronts', icon: Store, to: '/storefronts', hint: 'Storefront moderation' },
  { label: 'Withdrawals', icon: Wallet, to: '/withdrawals', hint: 'Pending withdrawal approvals' },
  { label: 'Fee Engine', icon: Sliders, to: '/fee-engine', hint: 'Fee configuration' },
  { label: 'Fee Profiles', icon: Zap, to: '/fee-profiles', hint: 'Fee profile management' },
  { label: 'AI Operations', icon: Bot, to: '/ai-ops', hint: 'AI assistant & insights' },
  { label: 'QR Forge', icon: QrCode, to: '/qr-forge', hint: 'QR code campaigns' },
  { label: 'Audit Log', icon: FileText, to: '/audit-log', hint: 'Admin action history' },
  { label: 'System Config', icon: Settings, to: '/config', hint: 'Global settings' },
];

// Quick actions that run inline (not just navigation)
const QUICK_ACTIONS = [
  { label: 'Refresh All Data', icon: RefreshCw, action: 'refresh', hint: 'Force refetch all data' },
];

export default function CommandPalette({ open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Global hotkey listener
  useEffect(() => {
    function handleKeyDown(e) {
      // ⌘K (macOS) or Ctrl+K (others)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      // Esc closes
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
      // Arrow keys
      if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        setSelectedIndex(prev => {
          const max = filtered.length - 1;
          if (e.key === 'ArrowDown') return prev >= max ? 0 : prev + 1;
          return prev <= 0 ? max : prev - 1;
        });
      }
      // Enter selects
      if (open && e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, query, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Build combined command list with quick actions
  const allCommands = useMemo(() => [
    ...QUICK_ACTIONS.map(a => ({ ...a, type: 'action' })),
    ...COMMANDS.map(c => ({ ...c, type: 'navigate' })),
  ], []);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.hint?.toLowerCase().includes(q)
    );
  }, [query, allCommands]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function executeCommand(cmd) {
    if (cmd.type === 'navigate' && cmd.to) {
      navigate(cmd.to);
    } else if (cmd.type === 'action' && cmd.action === 'refresh') {
      window.location.reload();
    }
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-az-surface border border-az-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-az-border">
          <Search className="w-4 h-4 text-az-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-az-text-muted outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-az-text-muted bg-az-card border border-az-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-az-text-muted text-sm">
              No results for "{query}"
            </div>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            const active = i === selectedIndex;
            return (
              <button
                key={cmd.label}
                data-idx={i}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-az-text-secondary hover:bg-az-card'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{cmd.label}</span>
                  {cmd.hint && (
                    <span className="ml-2 text-xs text-az-text-muted">{cmd.hint}</span>
                  )}
                </div>
                {active && <CornerDownLeft className="w-3.5 h-3.5 opacity-50" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-az-border text-xs text-az-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-az-card border border-az-border rounded font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 bg-az-card border border-az-border rounded font-mono">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-az-card border border-az-border rounded font-mono">↵</kbd>
              Select
            </span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}
