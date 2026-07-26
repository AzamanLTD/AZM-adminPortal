import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Swords, Users, TrendingUp, Wallet,
  Sliders, FileText, Shield, ChevronLeft, ChevronRight,
  Bell, Settings, LogOut, Database, Zap, Bot,
  PiggyBank, Siren, Home, Activity, Building2, Lock, FileCheck, QrCode,
  Store,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStats } from '@/lib/useAdminData';
import { useAdminNotifications } from '@/lib/useAdminNotifications';
import AlertBanner from './AlertBanner';
import NotificationCenter from './NotificationCenter';

const NAV = [
  { label: 'Command Center', icon: LayoutDashboard, to: '/' },
  { label: 'War Room',        icon: Swords,          to: '/war-room',       badge: 'disputes' },
  { label: 'Escrow Disputes', icon: Lock,            to: '/escrow-disputes', badge: 'escrow_disputes' },
  { label: 'Susu Groups',     icon: PiggyBank,       to: '/susu' },
  { label: 'Susu Incidents',  icon: Siren,           to: '/susu-incidents' },
  { label: 'Residency Queue', icon: Home,            to: '/residency-queue' },
  { label: 'Business KYB',    icon: FileCheck,       to: '/business-kyb',   badge: 'biz_kyb' },
  { label: 'Notifications',   icon: Bell,            to: '/notifications' },
  { label: 'Revenue',         icon: TrendingUp,      to: '/profits' },
  { label: 'Pool Monitor',    icon: Database,        to: '/pools' },
  { label: 'Users & KYC',     icon: Users,           to: '/users',          badge: 'kyc' },
  { label: 'Businesses',      icon: Building2,       to: '/businesses' },
  { label: 'Storefronts',    icon: Store,           to: '/storefronts' },
  { label: 'Withdrawals',     icon: Wallet,          to: '/withdrawals',    badge: 'withdrawals' },
  { label: 'Fee Engine',      icon: Sliders,         to: '/fee-engine' },
  { label: 'Fee Profiles',    icon: Zap,             to: '/fee-profiles' },
  { label: 'AI Operations',   icon: Bot,             to: '/ai-ops' },
  { label: 'QR Forge',         icon: QrCode,          to: '/qr-forge' },
  { label: 'Audit Log',       icon: FileText,        to: '/audit-log' },
  { label: 'System Config',   icon: Settings,        to: '/config' },
];

/** Format a timestamp as "Xm ago" / "Xh ago" relative label */
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();

  // Live notification feed — drives the bell badge + the slide-over panel.
  const notifications = useAdminNotifications();

  // Phase ADMIN-CONTROL-2: live GHS/USD rate from stats
  const { data: stats = {} } = useStats();

  // NAV badge counts — each NAV item's `badge` key maps to a stats field. A
  // count of 0 (or missing) hides the badge.
  const badgeCounts = {
    disputes:        stats.activeDisputes,
    escrow_disputes: stats.disputedEscrows,
    kyc:             stats.pendingKyc,
    biz_kyb:         stats.pendingBusinessKyb,
    withdrawals:     stats.pendingWithdrawals,
  };

  const liveRate      = stats.ghsRate ?? stats.liveUsdToGhs ?? null;
  const lastRateSync  = stats.lastRateSync ?? stats.rateUpdatedAt ?? null;
  const rateDisplay   = liveRate !== null ? Number(liveRate).toFixed(2) : '…';
  const rateAge       = relativeTime(lastRateSync);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--az-black)', color: 'var(--az-text-primary)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        'flex flex-col border-r transition-all duration-300 flex-shrink-0',
        'border-[#1e1e2e]',
        collapsed ? 'w-16' : 'w-60',
        // Mobile: slide-in drawer
        'fixed md:fixed inset-y-0 left-0 z-50 md:z-auto',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        'md:relative'
      )} style={{ background: 'var(--az-surface)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-[#1e1e2e]">
          <div className="w-8 h-8 rounded-xl bg-[#00d97e22] border border-[#00d97e40] flex items-center justify-center flex-shrink-0 az-glow-emerald">
            <Shield className="w-4 h-4 text-[#00d97e]" />
    </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-[#e8e8f0] leading-none tracking-tight">AZAMAN</p>
              <p className="text-xs text-[#00d97e] mt-0.5 font-medium">Control Center</p>
    </div>
          )}
    </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-0.5">
          {NAV.map(({ label, icon: Icon, to, badge }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            const count = badge ? Number(badgeCounts[badge]) || 0 : 0;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all duration-150 relative group text-sm',
                  active
                    ? 'bg-[#00d97e15] text-[#00d97e] font-semibold'
                    : 'text-[#4a4a6a] hover:bg-[#13131e] hover:text-[#7b7b9a]'
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active && 'text-[#00d97e]')} />
                {!collapsed && <span className="flex-1">{label}</span>}
                {/* Badge count — expanded sidebar */}
                {!collapsed && count > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-[#f43f5e] text-white rounded-full">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
                {/* Badge dot — collapsed sidebar */}
                {collapsed && count > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f43f5e] rounded-full" />
                )}
                {/* Left accent bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#00d97e] rounded-r-full" />
                )}
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#13131e] border border-[#2a2a3e] rounded-lg text-xs whitespace-nowrap text-[#e8e8f0] opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl">
                    {label}
    </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-[#1e1e2e] p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-[#13131e] text-[#4a4a6a] hover:text-[#7b7b9a] transition-colors"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span className="text-xs">Collapse</span></>
            }
          </button>
    </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* A-02: real-time critical-event alerts, above all content */}
        <AlertBanner />

        {/* Topbar */}
        <header
          className="h-16 border-b border-[#1e1e2e] flex items-center justify-between px-6 flex-shrink-0"
          style={{ background: 'var(--az-surface)' }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-[#13131e] text-[#7b7b9a] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Left: system status */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-[#00d97e]" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00d97e] az-pulse" />
    </div>
            <span className="text-xs text-[#4a4a6a] font-medium">System Online</span>
    </div>

          {/* Right: rate + notifications + user */}
          <div className="flex items-center gap-2">

            {/* Command palette trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#13131e] border border-[#1e1e2e] text-xs text-[#4a4a6a] hover:text-[#7b7b9a] hover:border-[#2a2a3e] transition-colors"
              title="Command palette (⌘K)"
            >
              <span>⌘K</span>
            </button>

            {/* Live GHS/USD rate — Phase ADMIN-CONTROL-2 FIX B */}
            <div
              className="flex items-center gap-2.5 bg-[#13131e] border border-[#1e1e2e] rounded-xl px-3 py-1.5 group relative cursor-default"
              title={lastRateSync ? `Last synced: ${new Date(lastRateSync).toLocaleTimeString()}` : 'Rate from oracle'}
            >
              <Activity className="w-3 h-3 text-[#4a4a6a]" />
              <span className="text-xs text-[#4a4a6a] az-mono">GHS/USD</span>
              <span className="text-sm font-bold text-[#00d97e] az-mono">{rateDisplay}</span>
              {/* Last-sync tooltip */}
              {rateAge && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#13131e] border border-[#2a2a3e] rounded-lg text-xs whitespace-nowrap text-[#7b7b9a] opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl">
                  Updated {rateAge}
    </div>
              )}
    </div>

            {/* Bell — opens the notification center; badge = unread open items */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 rounded-xl hover:bg-[#13131e] transition-colors"
              title="Notifications"
              aria-label={notifications.unreadCount > 0 ? `Notifications, ${notifications.unreadCount} unread` : 'Notifications'}
            >
              <Bell className="w-4 h-4 text-[#4a4a6a]" />
              {notifications.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-[#f43f5e] text-white rounded-full">
                  {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                </span>
              )}
            </button>

            {/* User pill */}
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#13131e] transition-colors border border-transparent hover:border-[#1e1e2e]">
              <div className="w-6 h-6 rounded-lg bg-[#00d97e22] border border-[#00d97e40] flex items-center justify-center">
                <span className="text-xs text-[#00d97e] font-bold">A</span>
    </div>
              {!collapsed && <span className="text-sm text-[#7b7b9a] font-medium">Admin</span>}
            </button>

            {/* Logout */}
            <button
              onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/login'; }}
              className="p-2 rounded-xl hover:bg-[#13131e] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-[#4a4a6a] hover:text-[#f43f5e] transition-colors" />
            </button>
    </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'var(--az-black)' }}>
          <Outlet />
        </main>
      </div>

      {/* Notification center slide-over (driven by the topbar bell) */}
      <NotificationCenter
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
      />

      {/* Command palette (⌘K / Ctrl+K) */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
