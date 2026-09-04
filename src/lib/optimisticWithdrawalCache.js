const QUERY_META_KEYS = ['frozen', 'counts', 'pagination'];

function preserveMetadata(next, previous) {
  const metadata = {};
  for (const key of QUERY_META_KEYS) metadata[key] = previous?.[key];
  return Object.assign(next, metadata);
}

export function patchWithdrawal(list, id, status) {
  if (!Array.isArray(list)) return list;
  return preserveMetadata(
    list.map((withdrawal) => (
      withdrawal.id === id ? { ...withdrawal, status } : withdrawal
    )),
    list,
  );
}

/**
 * Restore one optimistic item only when the cache still contains the value we
 * optimistically wrote. This prevents a failed mutation from rolling back a
 * newer realtime/refetched server value or another concurrent mutation.
 */
export function rollbackWithdrawal(list, id, previousItem, optimisticStatus) {
  if (!Array.isArray(list) || !previousItem) return list;
  const currentItem = list.find((withdrawal) => withdrawal.id === id);
  if (!currentItem || currentItem.status !== optimisticStatus) return list;
  return preserveMetadata(
    list.map((withdrawal) => (
      withdrawal.id === id ? previousItem : withdrawal
    )),
    list,
  );
}

export function captureWithdrawal(list, id) {
  if (!Array.isArray(list)) return null;
  return list.find((withdrawal) => withdrawal.id === id) || null;
}
