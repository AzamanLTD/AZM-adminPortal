import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Swords, Users, TrendingUp, Wallet,
  Sliders, FileText, Shield, Bell, Settings, LogOut,
  Database, Zap, Bot, PiggyBank, Siren, Home, Building2,
  Lock, FileCheck, QrCode, Store, ChevronRight, Menu, X,
  Search, Sun, Moon, Activity, AlertTriangle, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStats } from '@/lib/useAdminData';
import { useAdminNotifications } from '@/lib/useAdminNotifications';
import { useAuth } from '@/lib/AuthContext';
import AlertBanner from './AlertBanner';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import { pageVariants, sidebarVariants, sidebarTransition, spring } from '@/lib/motion';
import { AdminThemeToggle } from '@/components/ui/ThemeToggle';

// ── Navigation groups (Sentry-style: grouped by function) ──────────
const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { label: 'Command Center',   icon: LayoutDashboard, to: '/' },
      { label: 'War Room',         icon: Swords,          to: '/war-room',        badge: 'disputes' },
      { label: 'Escrow Disputes',  icon: Lock,            to: '/escrow-disputes', badge: 'escrow_disputes' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { label: 'Business KYB',     icon: FileCheck,       to: '/business-kyb',    badge: 'biz_kyb' },
      { label: 'Users & KYC',      icon: Users,           to: '/users',           badge: 'kyc' },
      { label: 'Residency Queue',  icon: Home,            to: '/residency-queue' },
      { label: 'Notifications',    icon: Bell,            to: '/notifications' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Revenue',          icon: TrendingUp,      to: '/profits' },
      { label: 'Withdrawals',      icon: Wallet,          to: '/withdrawals',     badge: 'withdrawals' },
      { label: 'Pool Monitor',     icon: Database,        to: '/pools' },
      { label: 'Fee Engine',       icon: Sliders,         to: '/fee-engine' },
      { label: 'Fee Profiles',     icon: Zap,             to: '/fee-profiles' },
    ],
  },
  {
    label: 'Susu',
    items: [
      { label: 'Susu Groups',      icon: PiggyBank,       to: '/susu' },
      { label: 'Susu Incidents',   icon: Siren,           to: '/susu-incidents' },
    ],
  },
  {
    label: 'Merchants',
    items: [
      { label: 'Businesses',       icon: Building2,       to: '/businesses' },
      { label: 'Storefronts',      icon: Store,           to: '/storefronts' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'AI Operations',    icon: Bot,             to: '/ai-ops' },
      { label: 'QR Forge',         icon: QrCode,          to: '/qr-forge' },
      { label: 'Audit Log',        icon: FileText,        to: '/audit-log' },
      { label: 'System Config',    icon: Settings,        to: '/config' },
    ],
  },
];

function relativeTime(ts) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminLayout() {
  const [collapsed, setCollapsed]   = useState(() => JSON.parse(localStorage.getItem('az-admin-collapsed') ?? 'false'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [cmdOpen, setCmdOpen]       = useState(false);
  const [theme, setTheme]           = useState(() => localStorage.getItem('az-admin-theme') ?? 'dark');
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth?.() ?? {};
  const notifications  = useAdminNotifications();
  const { data: stats = {} } = useStats();

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('az-admin-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark',  theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('az-admin-theme', theme);
  }, [theme]);

  // Cmd+K command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const badgeCounts = {
    disputes:        stats.activeDisputes,
    escrow_disputes: stats.disputedEscrows,
    kyc:             stats.pendingKyc,
    biz_kyb:         stats.pendingBusinessKyb,
    withdrawals:     stats.pendingWithdrawals,
  };

  const liveRate    = stats.ghsRate ?? stats.liveUsdToGhs ?? null;
  const lastSync    = stats.lastRateSync ?? stats.rateUpdatedAt ?? null;
  const rateDisplay = liveRate !== null ? Number(liveRate).toFixed(2) : '—';
  const rateAge     = relativeTime(lastSync);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = useCallback(() => {
    if (logout) { logout(); } else {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
  }, [logout]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--az-bg)', color: 'var(--az-text-primary)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <motion.aside
        animate={collapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        transition={sidebarTransition}
        className={cn(
          'az-sidebar flex-shrink-0',
          'fixed md:fixed inset-y-0 left-0 z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'md:relative'
        )}
        style={{ width: collapsed ? 64 : 240 }}
      >
        {/* ── Brand ── */}
        <div className="flex items-center justify-between px-3 py-4 border-b" style={{ borderColor: 'var(--az-border)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/azaman-logo.png"
              alt="Azaman"
              className="w-8 h-8 flex-shrink-0 rounded-lg object-contain"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,217,126,0.3))' }}
            />
            <AnimatePresence initial={false}>
              {(!collapsed || mobileOpen) && (
                <motion.div
                  key="brand-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm font-semibold leading-tight whitespace-nowrap" style={{ color: 'var(--az-text-primary)' }}>Azaman</p>
                  <p className="text-[10px] font-medium tracking-widest uppercase leading-tight" style={{ color: 'var(--az-text-muted)' }}>Admin</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!mobileOpen && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="az-btn az-btn-ghost p-1.5 rounded-lg"
              aria-label="Toggle sidebar"
            >
              <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={spring.snappy}>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--az-text-muted)' }} />
              </motion.div>
            </button>
          )}
        </div>

        {/* ── Search shortcut ── */}
        <div className="px-3 py-2">
          <button
            onClick={() => setCmdOpen(true)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all duration-150',
              collapsed && !mobileOpen ? 'justify-center' : ''
            )}
            style={{
              background: 'var(--az-surface-3)',
              border: '1px solid var(--az-border)',
              color: 'var(--az-text-muted)',
            }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <AnimatePresence initial={false}>
              {(!collapsed || mobileOpen) && (
                <motion.span
                  key="search-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap flex-1 text-left"
                >
                  Search...
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {(!collapsed || mobileOpen) && (
                <motion.kbd
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[10px] px-1 py-0.5 rounded font-mono"
                  style={{ background: 'var(--az-surface-5)' }}
                >
                  ⌘K
                </motion.kbd>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* ── Nav groups ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <AnimatePresence initial={false}>
                {(!collapsed || mobileOpen) && (
                  <motion.p
                    key={`label-${group.label}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="az-nav-section-label overflow-hidden"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              {group.items.map((item) => {
                const isActive = location.pathname === item.to ||
                  (item.to !== '/' && location.pathname.startsWith(item.to));
                const count = item.badge ? (badgeCounts[item.badge] ?? 0) : 0;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed && !mobileOpen ? item.label : undefined}
                    className={cn(
                      'az-nav-item group relative',
                      isActive && 'active',
                    )}
                  >
                    <item.icon className={cn('w-4 h-4 flex-shrink-0')} />
                    <AnimatePresence initial={false}>
                      {(!collapsed || mobileOpen) && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden whitespace-nowrap flex-1"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {(!collapsed || mobileOpen) && count > 0 && (
                      <motion.span
                        key={`badge-${item.to}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring.bouncy ? { type: 'spring', stiffness: 500, damping: 20, mass: 0.8 } : { duration: 0.2 }}
                        className="az-badge"
                      >
                        {count > 99 ? '99+' : count}
                      </motion.span>
                    )}
                    {collapsed && !mobileOpen && count > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--az-red)' }} />
                    )}
                    {collapsed && !mobileOpen && (
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl"
                        style={{
                          background: 'var(--az-surface-3)',
                          border: '1px solid var(--az-border-bright)',
                          color: 'var(--az-text-primary)',
                        }}>
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="border-t px-3 py-2" style={{ borderColor: 'var(--az-border)' }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full az-btn az-btn-ghost py-2 rounded-lg"
          >
            <AnimatePresence initial={false}>
              {(!collapsed || mobileOpen) && (
                <motion.span
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
            <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={spring.snappy}>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--az-text-muted)' }} />
            </motion.div>
          </button>
        </div>
      </motion.aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <AlertBanner />

        {/* Topbar */}
        <header className="az-header" style={{ height: 'var(--header-height)' }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden az-btn az-btn-ghost p-2 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Left: system status */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--az-emerald)' }} />
              <div className="absolute inset-0 w-2 h-2 rounded-full az-pulse" style={{ background: 'var(--az-emerald)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--az-text-muted)' }}>System Online</span>
          </div>

          {/* Right: theme + rate + notifications + user */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <AdminThemeToggle theme={theme} setTheme={setTheme} />

            {/* Command palette trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: 'var(--az-surface-3)',
                border: '1px solid var(--az-border)',
                color: 'var(--az-text-muted)',
              }}
              title="Command palette (⌘K)"
            >
              <Search className="w-3 h-3" />
              <span className="hidden sm:inline">⌘K</span>
            </button>

            {/* Live GHS/USD rate */}
            <div
              className="hidden sm:flex items-center gap-2.5 rounded-lg px-3 py-1.5 group relative cursor-default"
              style={{
                background: 'var(--az-surface-3)',
                border: '1px solid var(--az-border)',
              }}
              title={lastSync ? `Last synced: ${new Date(lastSync).toLocaleTimeString()}` : 'Rate from oracle'}
            >
              <Activity className="w-3 h-3" style={{ color: 'var(--az-text-muted)' }} />
              <span className="text-xs az-mono" style={{ color: 'var(--az-text-muted)' }}>GHS/USD</span>
              <span className="text-sm font-bold az-mono" style={{ color: 'var(--az-emerald)' }}>{rateDisplay}</span>
              {rateAge && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl"
                  style={{
                    background: 'var(--az-surface-3)',
                    border: '1px solid var(--az-border-bright)',
                    color: 'var(--az-text-secondary)',
                  }}>
                  Updated {rateAge}
                </div>
              )}
            </div>

            {/* Bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative az-btn az-btn-ghost p-2 rounded-lg"
              title="Notifications"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="az-badge absolute -top-0.5 -right-0.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* User pill */}
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: '1px solid transparent' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--az-emerald-soft)', border: '1px solid var(--az-emerald-glow)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--az-emerald)' }}>A</span>
              </div>
              <span className="text-sm font-medium hidden sm:inline" style={{ color: 'var(--az-text-secondary)' }}>Admin</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="az-btn az-btn-ghost p-2 rounded-lg"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" style={{ color: 'var(--az-text-muted)' }} />
            </button>
          </div>
        </header>

        {/* Page content with animated transitions */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'var(--az-bg)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Notification center slide-over */}
      <NotificationCenter
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
      />

      {/* Command palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
