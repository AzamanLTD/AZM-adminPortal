import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Swords, Users, TrendingUp, Wallet,
  Sliders, FileText, Bell, Settings, LogOut,
  Database, Zap, Bot, PiggyBank, Siren, Home, Building2,
  Lock, FileCheck, QrCode, Store, Menu, Search, Sun, Moon, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStats } from '@/lib/useAdminData';
import { useAdminNotifications } from '@/lib/useAdminNotifications';
import { useAuth } from '@/lib/AuthContext';
import AlertBanner from './AlertBanner';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';

/* ── Navigation structure (Sentry / Klaviyo style: grouped with labels) ── */
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

/* ── Single nav item with Sentry-style left active bar ── */
function NavItem({ item, collapsed, badges }) {
  const location = useLocation();
  const isActive =
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to);
  const count = item.badge ? (badges[item.badge] || 0) : 0;

  return (
    <Link
      to={item.to}
      className={cn('az-nav-item group', isActive && 'active', collapsed && 'justify-center !px-0')}
      title={collapsed ? item.label : undefined}
    >
      <item.icon
        className={cn(
          'flex-shrink-0',
          isActive ? 'text-[var(--f-ok)]' : 'text-[var(--f-text-3)] group-hover:text-[var(--f-text)]'
        )}
        style={{ width: 15, height: 15 }}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {count > 0 && (
            <span className="az-badge az-badge-red ml-auto">{count > 99 ? '99+' : count}</span>
          )}
        </>
      )}
      {collapsed && count > 0 && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--f-bad)]" />
      )}
    </Link>
  );
}

/* ── Main Layout ── */
export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(
    () => JSON.parse(localStorage.getItem('az-admin-collapsed') ?? 'false')
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [cmdOpen,    setCmdOpen]    = useState(false);
  const [theme,      setTheme]      = useState(
    () => localStorage.getItem('az-admin-theme') ?? 'light'
  );

  const location    = useLocation();
  const { logout }  = useAuth?.() ?? {};

  // useAdminNotifications returns { open, resolved, all, unreadCount, markRead, markAllRead, isLoading }
  const notifications = useAdminNotifications();
  const { data: stats = {} } = useStats();

  const badges = {
    disputes:        stats.activeDisputes    || 0,
    escrow_disputes: stats.disputedEscrows   || 0,
    kyc:             stats.pendingKyc        || 0,
    withdrawals:     stats.pendingWithdrawals || 0,
    biz_kyb:         stats.pendingBusinessKyb || 0,
  };

  const unreadCount = notifications?.unreadCount || 0;

  // Apply/remove dark class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('az-admin-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('az-admin-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ⌘K shortcut for command palette
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

  /* ── Sidebar content (shared between desktop + mobile) ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 shrink-0 border-b',
          'border-[var(--f-line)]',
          collapsed ? 'justify-center py-4 px-2' : 'px-4 py-3.5',
        )}
        style={{ height: 'var(--header-height)', minHeight: 'var(--header-height)' }}
      >
        <img
          src="/azaman-logo.png"
          alt="Azaman"
          className={cn('rounded-lg object-contain flex-shrink-0', collapsed ? 'w-7 h-7' : 'w-8 h-8')}
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-[var(--f-text)] truncate">AZAMAN</p>
            <p className="text-[10px] font-medium text-[var(--f-text-3)]">Admin Portal</p>
          </div>
        )}
      </div>

      {/* Navigation — scrollable */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-0.5">
            {!collapsed ? (
              <span className="az-nav-label">{group.label}</span>
            ) : (
              <div className="h-3" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} badges={badges} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: sign out */}
      <div className="shrink-0 border-t border-[var(--f-line)] p-2">
        <button
          onClick={() => logout?.()}
          className={cn('az-nav-item w-full text-left', collapsed && 'justify-center !px-0')}
        >
          <LogOut style={{ width: 15, height: 15 }} className="text-[var(--f-text-3)]" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--f-bg)' }}>

      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col shrink-0 border-r overflow-hidden"
        style={{
          background:   'var(--f-surface)',
          borderColor:  'var(--f-line)',
        }}
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-60 border-r flex flex-col"
              style={{
                background:  'var(--f-surface)',
                borderColor: 'var(--f-line)',
              }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Topbar ── */}
        <header
          className="shrink-0 flex items-center gap-2 px-4 border-b"
          style={{
            height:      'var(--header-height)',
            minHeight:   'var(--header-height)',
            background:  'var(--f-surface)',
            borderColor: 'var(--f-line)',
          }}
        >
          {/* Collapse / mobile open */}
          <button
            onClick={() =>
              typeof window !== 'undefined' && window.innerWidth < 1024
                ? setMobileOpen(true)
                : setCollapsed((c) => !c)
            }
            className="p-1.5 rounded-md hover:bg-[var(--f-surface-sunken)] text-[var(--f-text-3)] transition-colors"
          >
            <Menu style={{ width: 16, height: 16 }} />
          </button>

          {/* Search / command palette trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors min-w-[160px] max-w-[260px]"
            style={{
              border:     '1px solid var(--f-line)',
              background: 'var(--f-surface)',
              color:      'var(--f-text-3)',
            }}
          >
            <Search style={{ width: 13, height: 13 }} />
            <span className="text-xs flex-1 text-left">Search...</span>
            <kbd
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                background:  'var(--f-surface-raised)',
                borderColor: 'var(--f-line)',
                color:       'var(--f-text-3)',
              }}
            >
              ⌘K
            </kbd>
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="p-1.5 rounded-md hover:bg-[var(--f-surface-sunken)] text-[var(--f-text-3)] transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun  style={{ width: 15, height: 15 }} />
              : <Moon style={{ width: 15, height: 15 }} />}
          </button>

          {/* Notifications bell */}
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-1.5 rounded-md hover:bg-[var(--f-surface-sunken)] text-[var(--f-text-3)] transition-colors"
          >
            <Bell style={{ width: 15, height: 15 }} />
            {unreadCount > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border"
                style={{
                  background:  'var(--f-bad)',
                  borderColor: 'var(--f-surface)',
                }}
              />
            )}
          </button>

          {/* Admin avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center border"
            style={{
              background:  'var(--f-ok-bg)',
              borderColor: 'var(--f-ok)',
            }}
          >
            <Shield style={{ width: 13, height: 13, color: 'var(--f-ok)' }} />
          </div>
        </header>

        {/* Alert banner (if any) */}
        <AlertBanner />

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="p-6 max-w-[1400px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Overlay panels — use onOpenChange (not onClose) to match component API */}
      <NotificationCenter
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
      />
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
      />
    </div>
  );
}
