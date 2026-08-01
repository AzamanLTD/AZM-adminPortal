import { createContext, useContext, useEffect, useRef } from 'react';

const ScopeCtx = createContext(['global']);

/** Innermost scope wins. A modal automatically silences list shortcuts. */
export const KeyScope = ({ id, children }) => {
  const parent = useContext(ScopeCtx);
  return <ScopeCtx.Provider value={[...parent, id]}>{children}</ScopeCtx.Provider>;
};

const isTyping = el =>
  ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName) || el?.isContentEditable;

export function useKey(scope, key, handler, deps = []) {
  const scopes = useContext(ScopeCtx);
  const active = scopes[scopes.length - 1] === scope;
  useEffect(() => {
    if (!active) return;
    const on = e => {
      if (isTyping(e.target)) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault(); handler(e);
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [active, key, ...deps]);   // eslint-disable-line
}

/** `g` then `d` — 800ms window, the Gmail/Linear standard. */
export function useSequence(seq, handler, timeout = 800) {
  const buf = useRef([]); const t = useRef();
  useEffect(() => {
    const on = e => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey) return;
      buf.current.push(e.key.toLowerCase());
      clearTimeout(t.current);
      t.current = setTimeout(() => { buf.current = []; }, timeout);
      const tail = buf.current.slice(-seq.length).join('');
      if (tail === seq.join('')) { buf.current = []; handler(); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [handler]);   // eslint-disable-line
}
