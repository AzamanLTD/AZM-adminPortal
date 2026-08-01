// src/lib/optimistic.js
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/components/forge/toast';

/**
 * Every user-initiated state change in the product goes through this.
 * Result paints in <16ms; the server reconciles later; failure rolls back
 * to an exact snapshot and tells the user what happened.
 */
export function useOptimistic({
  queryKey, mutationFn, apply, entityId,
  successMessage, undoFn, errorMessage = "That didn't save",
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    scope: entityId ? { id: entityId } : undefined,
    onMutate: async variables => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, old => apply(old, variables));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(queryKey, ctx.previous);
      notify('error', errorMessage, {
        description: err?.message ?? 'Reverted. Nothing was changed on the server.',
      });
    },
    onSuccess: () => {
      if (successMessage) notify('success', successMessage, { undo: undoFn });
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

/** Pending indicators. Never show one before 400ms. */
export function useDelayedFlag(active, delay = 400) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);
  return show;
}
