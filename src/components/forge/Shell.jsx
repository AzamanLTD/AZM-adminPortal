import { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu, Search, Bell, Sun, Moon, ChevronDown,
} from 'lucide-react';
import { resolveNav } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { useCommandPalette } from '@/lib/command';
import { useSequence } from '@/lib/keys';
import { Tag } from './Tag';
import { cn } from '@/lib/utils';

export function Shell({ children, navProps, brandName = 'Azaman', brandShort = 'AZ' }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const nav = useMemo(() => resolveNav(navProps), [navProps]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="f-shell" data-collapsed={collapsed || undefined}>
      {/* ── Sidebar ── */}
      <aside className="f-rail">
        <div className="f-rail__brand">
          <div className="f-rail__logo" aria-hidden>{brandShort}</div>
          {!collapsed && <span className="f-rail__name">{brandName}</span>}
        </div>
        <nav className="f-rail__nav" aria-label="Primary">
          {nav.map(domain => (
            <div key={domain.id} className="f-rail__domain">
              <div className="f-rail__domain-label">
                {!collapsed && domain.label}
              </div>
              {domain.groups.map(group => (
                <div key={group.label} className="f-rail__group">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.to} to={item.to}
                        className={({isActive}) => cn('f-rail__item', isActive && 'is-active')}
                        title={collapsed ? item.label : undefined}
                        end={item.to === '/'}>
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {!collapsed && <span className="f-rail__item-label">{item.label}</span>}
                        {!collapsed && item.badge != null && item.badge > 0 && (
                          <span className="f-rail__badge">{item.badge}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="f-scrim md:hidden"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside className="f-rail f-rail--mobile"
              initial={{ x:'-100%' }} animate={{ x:0 }} exit={{ x:'-100%' }}
              transition={{ type:'spring', stiffness:400, damping:35 }}>
              <MobileNav nav={nav} brandName={brandName} brandShort={brandShort}
                         onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ── */}
      <div className="f-main">
        <Topbar onMenuClick={() => setMobileOpen(true)} onCollapseToggle={() => setCollapsed(c => !c)}
                collapsed={collapsed} brandName={brandName} />
        <main className="f-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileNav({ nav, brandName, brandShort, onNavigate }) {
  return (
    <>
      <div className="f-rail__brand">
        <div className="f-rail__logo" aria-hidden>{brandShort}</div>
        <span className="f-rail__name">{brandName}</span>
      </div>
      <nav className="f-rail__nav" onClick={onNavigate}>
        {nav.map(domain => (
          <div key={domain.id} className="f-rail__domain">
            <div className="f-rail__domain-label">{domain.label}</div>
            {domain.groups.map(group => (
              <div key={group.label} className="f-rail__group">
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to}
                      className={({isActive}) => cn('f-rail__item', isActive && 'is-active')}
                      end={item.to === '/'}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="f-rail__item-label">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="f-rail__badge">{item.badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

function Topbar({ onMenuClick, onCollapseToggle, collapsed, brandName }) {
  const { theme, toggle } = useTheme();
  const { open } = useCommandPalette();

  useSequence(['g','d']); // g→d goes to dashboard — wired at App level

  return (
    <header className="f-topbar">
      <div className="f-topbar__left">
        <button className="f-icon-btn md:hidden" onClick={onMenuClick} aria-label="Menu">
          <Menu className="h-4 w-4" />
        </button>
        <button className="f-icon-btn hidden md:flex" onClick={onCollapseToggle}
                aria-label={collapsed ? 'Expand' : 'Collapse'}>
          <Menu className="h-4 w-4" />
        </button>
        <Breadcrumb />
      </div>
      <div className="f-topbar__right">
        <button className="f-cmd-trigger" onClick={open}>
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="f-kbd">⌘K</kbd>
        </button>
        <button className="f-icon-btn" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="f-icon-btn relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="f-dot f-dot--warn" aria-hidden />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (!segments.length) return <span className="f-topbar__crumb">Dashboard</span>;
  return (
    <nav className="f-topbar__crumb" aria-label="Breadcrumb">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-ink-3">/</span>}
          <span className={i === segments.length - 1 ? 'text-ink' : 'text-ink-3'}>
            {seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')}
          </span>
        </span>
      ))}
    </nav>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const on = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button className="f-avatar-btn" onClick={() => setOpen(o => !o)}>
        <div className="f-avatar f-avatar--sm">A</div>
        <ChevronDown className="h-3 w-3 text-ink-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="f-pop f-pop--right"
            initial={{ opacity:0, scale:0.97, y:-4 }} animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.98, y:-2 }}
            transition={{ duration:0.12, ease:[0.16,1,0.3,1] }}>
            <div className="f-pop__group">
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-ink">Account</div>
                <div className="text-xs text-ink-3">Signed in</div>
              </div>
            </div>
            <div className="f-pop__group">
              <button className="f-pop__item">Profile</button>
              <button className="f-pop__item">Settings</button>
              <button className="f-pop__item f-pop__item--danger">Sign out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
