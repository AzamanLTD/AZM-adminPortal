import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

/** 80ms of sustained hover = intent. Filters out mouse fly-overs. */
export function usePrefetchOnIntent(queryKey, queryFn, { delay = 80, chunk } = {}) {
  const qc = useQueryClient();
  const t = useRef();
  const start = () => {
    t.current = setTimeout(() => {
      qc.prefetchQuery({ queryKey, queryFn, staleTime: 30_000 });
      chunk?.();
    }, delay);
  };
  const stop = () => clearTimeout(t.current);
  return { onPointerEnter:start, onPointerLeave:stop, onFocus:start, onBlur:stop };
}
