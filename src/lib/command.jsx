import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
const Ctx = createContext(null);

export function CommandProvider({ children }) {
  const [isOpen, setOpen] = useState(false);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    const onKey = e => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setOpen(v => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /** Pages register contextual actions; they vanish on unmount. */
  const register = useCallback(list => {
    setActions(prev => [...prev, ...list]);
    return () => setActions(prev => prev.filter(a => !list.includes(a)));
  }, []);

  const value = useMemo(() => ({
    isOpen, actions, register,
    open:()=>setOpen(true), close:()=>setOpen(false), setOpen,
  }), [isOpen, actions, register]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCommandPalette = () => useContext(Ctx);

/** Page-level contextual commands. */
export function usePageCommands(list, deps = []) {
  const { register } = useCommandPalette();
  useEffect(() => register(list), deps);   // eslint-disable-line
}
