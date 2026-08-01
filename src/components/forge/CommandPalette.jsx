import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useCommandPalette } from '@/lib/command';
import { Kbd } from './Kbd';
import { resolveNav } from '@/lib/nav';

export function CommandPalette({ navProps }) {
  const { isOpen, close, actions } = useCommandPalette();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const items = useMemo(() => {
    const nav = resolveNav(navProps);
    const navItems = [];
    nav.forEach(d => d.groups.forEach(g => g.items.forEach(i => {
      navItems.push({ type:'nav', label:i.label, to:i.to, icon:i.icon });
    })));
    const all = [...navItems, ...actions];
    if (!query.trim()) return all.slice(0, 10);
    const q = query.toLowerCase();
    return all.filter(i => i.label.toLowerCase().includes(q)).slice(0, 10);
  }, [navProps, actions, query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { if (!isOpen) setQuery(''); }, [isOpen]);

  const exec = item => {
    if (item.to) navigate(item.to);
    if (item.action) item.action();
    close();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="f-scrim" initial={{ opacity:0 }} animate={{ opacity:1 }}
                      exit={{ opacity:0 }} onClick={close} />
          <div className="f-cmd-root">
            <motion.div className="f-cmd"
              initial={{ opacity:0, scale:0.98, y:-8 }} animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.98, y:-4 }}
              transition={{ duration:0.15, ease:[0.16,1,0.3,1] }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a+1, items.length-1)); }
                if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a-1, 0)); }
                if (e.key === 'Escape')    { e.preventDefault(); close(); }
                if (e.key === 'Enter' && items[active]) { e.preventDefault(); exec(items[active]); }
              }}>
              <div className="f-cmd__input">
                <Search className="h-4 w-4 text-ink-3" />
                <input autoFocus value={query}
                       onChange={e => setQuery(e.target.value)}
                       placeholder="Search pages, actions…"
                       aria-label="Command palette search" />
                <Kbd>esc</Kbd>
              </div>
              <div className="f-cmd__list">
                {items.length === 0 && (
                  <div className="f-cmd__empty">No matches for "{query}"</div>
                )}
                {items.map((item, i) => {
                  const Icon = item.icon || ArrowRight;
                  return (
                    <button key={i} className={`f-cmd__item ${i === active ? 'is-active' : ''}`}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => exec(item)}>
                      <Icon className="h-3.5 w-3.5 text-ink-3" />
                      <span>{item.label}</span>
                      {i === active && <CornerDownLeft className="h-3 w-3 ml-auto text-ink-3" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
