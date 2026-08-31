import { createContext, useContext, useEffect, useRef } from 'react';

const ScopeCtx = createContext(['global']);
export const KeyScope = ({ id, children }) => {
  const parent = useContext(ScopeCtx);
  return <ScopeCtx.Provider value={[...parent, id]}>{children}</ScopeCtx.Provider>;
};
const isTyping = el => ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName) || el?.isContentEditable;
export function useKey(scope, key, handler, deps = []) {
  const scopes = useContext(ScopeCtx); const active = scopes[scopes.length - 1] === scope;
  useEffect(() => {
    if (!active) return;
    const on = e => { if (isTyping(e.target) || e.key.toLowerCase() !== key.toLowerCase() || e.metaKey || e.ctrlKey || e.altKey) return; e.preventDefault(); handler(e); };
    document.addEventListener('keydown', on); return () => document.removeEventListener('keydown', on);
  }, [active, key, ...deps]);
}
export function useSequence(seq, handler, timeout = 800) {
  const buf = useRef([]);
  /** @type {import('react').MutableRefObject<ReturnType<typeof setTimeout> | undefined>} */
  const t = useRef(undefined);
  useEffect(() => {
    const on = e => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey) return;
      buf.current.push(e.key.toLowerCase()); clearTimeout(t.current);
      t.current = setTimeout(() => { buf.current = []; }, timeout);
      const tail = buf.current.slice(-seq.length).join('');
      if (tail === seq.join('')) { buf.current = []; handler(); }
    };
    document.addEventListener('keydown', on); return () => document.removeEventListener('keydown', on);
  }, [handler]);
}
