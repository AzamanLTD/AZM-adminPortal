// src/components/forge/ProfileMenu.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { spring } from '@/lib/motion';

/**
 * Real profile menu with initials avatar, admin email, role, sign-out with confirm.
 * Works for both portals — pass user info and logout handler via props.
 */
export function ProfileMenu({ user, onLogout, onNavigateSettings }) {
  const [open, setOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const on = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirmOut(false); } };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, []);

  const initials = (user?.username || user?.email || user?.name || 'A')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0].toUpperCase())
    .join('') || 'A';

  const displayName = user?.username || user?.name || user?.email?.split('@')[0] || 'Admin';
  const displayEmail = user?.email || user?.username ? `${user.username}` : 'Signed in';
  const role = user?.role || 'ADMIN';

  return (
    <div className="relative" ref={ref}>
      <button className="f-avatar-btn" onClick={() => setOpen(o => !o)}>
        <div className="f-avatar f-avatar--sm">{initials}</div>
        <ChevronDown className="h-3 w-3 text-ink-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="f-pop f-pop--right"
            initial={{ opacity:0, scale:0.97, y:-4 }}
            animate={{ opacity:1, scale:1, y:0, transition: spring.popover }}
            exit={{ opacity:0, scale:0.98, y:-2, transition: spring.popover }}>
            <div className="f-pop__group">
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-ink">{displayName}</div>
                <div className="text-xs text-ink-3">{displayEmail}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-tint" />
                  {role}
                </div>
              </div>
            </div>
            <div className="f-pop__group">
              <button className="f-pop__item" onClick={() => { onNavigateSettings?.(); setOpen(false); }}>
                <SettingsIcon className="w-3.5 h-3.5" />
                Settings
              </button>
              {confirmOut ? (
                <button className="f-pop__item f-pop__item--danger" onClick={() => { onLogout?.(); setOpen(false); setConfirmOut(false); }}>
                  <LogOut className="w-3.5 h-3.5" />
                  Confirm sign out
                </button>
              ) : (
                <button className="f-pop__item f-pop__item--danger" onClick={() => setConfirmOut(true)}>
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfileMenu;
