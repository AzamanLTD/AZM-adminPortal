import { useEffect } from 'react';
// src/lib/prefetch.js
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

/** 80ms of sustained hover = intent. Filters out mouse fly-overs. */
export function usePrefetch(queryKey, queryFn, staleTime = 30_000) {
  const qc = useQueryClient();
  const timer = useRef();

  return {
    onPointerEnter: () => {
      timer.current = setTimeout(() => {
        qc.prefetchQuery({ queryKey, queryFn, staleTime });
      }, 80);
    },
    onPointerLeave: () => clearTimeout(timer.current),
  };
}

/** Prefetch on visible — for tabbed sections that aren't mounted yet. */
export function usePrefetchOnVisible(queryKey, queryFn, staleTime = 30_000) {
  const qc = useQueryClient();
  const ref = useRef(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!ref.current || fetched.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fetched.current) {
        fetched.current = true;
        qc.prefetchQuery({ queryKey, queryFn, staleTime });
      }
    }, { rootMargin: '200px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return ref;
}

