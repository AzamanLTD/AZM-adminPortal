import { financialApi } from './financialApi';

// GET /api/admin/withdrawals/pending is cursor-paginated on the backend
// (default limit 100, envelope { nextCursor, hasMore }). Fetching a single
// page silently truncates the operator's review queue: with a backlog over
// one page, older withdrawals disappear from the list, the stats and the
// batch actions without any indication. This walker drains the whole queue,
// bounded, and reports honest truncation when it stops early.
const MAX_PAGES = 5;

/**
 * Drain the pending-withdrawal queue across its cursor pages.
 *
 * @param {{ fetchPage?: (cursor: string | number | null) => Promise<any>, maxPages?: number }} [options]
 * @returns {Promise<{ rows: any[], frozen: any[], counts: { pending: number, frozen: number }, pagination: any, truncated: boolean }>}
 */
export async function fetchPendingWithdrawalQueue({
  fetchPage = (cursor) => financialApi.withdrawals.pendingPage(cursor),
  maxPages = MAX_PAGES,
} = {}) {
  /** @type {any[]} */
  const rows = [];
  /** @type {any[]} */
  let frozen = [];
  let counts = { pending: 0, frozen: 0 };
  /** Pagination envelope from the (zod-validated upstream) backend response. */
  let pagination = /** @type {any} */ (null);
  let cursor = null;
  // Guards against cursor cycles (A -> B -> A): an already-visited cursor
  // means the backend is re-serving pages, not advancing.
  const seenCursors = new Set([null]);

  for (let fetched = 0; fetched < maxPages; fetched++) {
    const response = await fetchPage(cursor);
    const page = response?.data;
    if (!page || !Array.isArray(page.pending)) {
      throw new Error('Malformed pending-withdrawals page: missing data.pending');
    }

    // A stuck cursor can re-serve the same page; never let duplicates into
    // the queue (an operator would act on them twice).
    const seen = new Set(rows.map((r) => r?.id));
    for (const row of page.pending) {
      if (row && row.id != null && seen.has(row.id)) continue;
      if (row && row.id != null) seen.add(row.id);
      rows.push(row);
    }
    // The backend recomputes the frozen exception list on every page; the
    // first page's copy is authoritative for the current refetch.
    if (fetched === 0) {
      frozen = Array.isArray(page.frozen) ? page.frozen : [];
      counts = page.counts || { pending: rows.length, frozen: frozen.length };
    }
    // The first page is requested without a cursor, so the backend serves it
    // in offset mode and includes the authoritative pagination.total for the
    // whole PENDING backlog. Cursor pages omit total — preserve the
    // first-page value so the queue metadata never loses it.
    if (page.pagination) {
      pagination = page.pagination.total != null
        ? page.pagination
        : { ...page.pagination, total: pagination?.total };
    }

    if (pagination?.hasMore === false) {
      // Backend says the queue is fully drained.
      return {
        rows,
        frozen,
        counts: { ...counts, pending: rows.length },
        pagination,
        truncated: false,
      };
    }

    const nextCursor = pagination?.nextCursor;
    // hasMore is true (or unknown). Only an advancing, never-repeated cursor
    // lets us keep draining. A repeated or cyclic cursor is a server-side
    // pagination defect: completeness is NOT established. Stop safely (the
    // row dedupe above already kept duplicates out), keep the last
    // pagination metadata for diagnostics, and never present the queue as
    // complete.
    if (nextCursor == null || nextCursor === cursor || seenCursors.has(nextCursor)) {
      return {
        rows,
        frozen,
        counts: { ...counts, pending: rows.length },
        pagination,
        truncated: true,
      };
    }
    seenCursors.add(cursor);
    cursor = nextCursor;
  }

  // Page budget exhausted while the backend still reports more data. Do not
  // pretend the queue is complete — flag the truncation so the UI can say so.
  return {
    rows,
    frozen,
    counts: { ...counts, pending: rows.length },
    pagination,
    truncated: true,
  };
}
