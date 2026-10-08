import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pendingPage: vi.fn() }));

vi.mock('./financialApi', () => ({
  financialApi: { withdrawals: { pendingPage: mocks.pendingPage } },
}));

import { fetchPendingWithdrawalQueue } from './withdrawalQueue';

const page = (pending, pagination, frozen = [], counts = { pending: pending.length, frozen: frozen.length }) => ({
  data: { pending, frozen, counts, pagination },
});

describe('fetchPendingWithdrawalQueue', () => {
  it('drains the whole queue across cursor pages', async () => {
    mocks.pendingPage
      .mockResolvedValueOnce(page([{ id: 1 }], { nextCursor: 2, hasMore: true, limit: 1 }))
      .mockResolvedValueOnce(page([{ id: 2 }], { nextCursor: 3, hasMore: true, limit: 1 }))
      .mockResolvedValueOnce(page([{ id: 3 }], { nextCursor: null, hasMore: false, limit: 1 }));

    const result = await fetchPendingWithdrawalQueue();

    expect(mocks.pendingPage).toHaveBeenNthCalledWith(1, null);
    expect(mocks.pendingPage).toHaveBeenNthCalledWith(2, 2);
    expect(mocks.pendingPage).toHaveBeenNthCalledWith(3, 3);
    expect(result.rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(result.truncated).toBe(false);
    expect(result.counts.pending).toBe(3);
  });

  it('keeps the first page frozen exceptions and reports them alongside the queue', async () => {
    const frozen = [{ id: 'f1', status: 'FROZEN_DISPUTE', user: { id: 7 } }];
    mocks.pendingPage.mockReset();
    mocks.pendingPage
      .mockResolvedValueOnce(page([{ id: 1 }], { nextCursor: 2, hasMore: true, limit: 1 }, frozen))
      .mockResolvedValueOnce(page([{ id: 2 }], { nextCursor: null, hasMore: false, limit: 1 }, frozen));

    const result = await fetchPendingWithdrawalQueue();

    expect(result.frozen).toEqual(frozen);
    expect(result.counts.frozen).toBe(1);
    expect(result.counts.pending).toBe(2);
  });

  it('stops at a single page when the backend reports no more data', async () => {
    mocks.pendingPage.mockReset();
    mocks.pendingPage.mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }], { nextCursor: null, hasMore: false, limit: 100 }));

    const result = await fetchPendingWithdrawalQueue();

    expect(mocks.pendingPage).toHaveBeenCalledTimes(1);
    expect(result.rows).toHaveLength(2);
    expect(result.truncated).toBe(false);
  });

  it('reports honest truncation when the page budget is exhausted while data remains', async () => {
    mocks.pendingPage.mockReset();
    mocks.pendingPage.mockImplementation(async (cursor) =>
      page([{ id: cursor ?? 0 }], { nextCursor: (cursor ?? 0) + 1, hasMore: true, limit: 1 }));

    const result = await fetchPendingWithdrawalQueue({ maxPages: 3 });

    expect(mocks.pendingPage).toHaveBeenCalledTimes(3);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(3);
  });

  it('reports truncation on a cursor that does not advance (server defect guard)', async () => {
    mocks.pendingPage.mockReset();
    // Broken backend: keeps returning the same cursor with hasMore: true.
    mocks.pendingPage.mockResolvedValue(page([{ id: 1 }], { nextCursor: 1, hasMore: true, limit: 1 }));

    const result = await fetchPendingWithdrawalQueue({ maxPages: 5 });

    // Second fetch re-serves the same page; the guard detects the stuck
    // cursor, dedupes the repeated rows, and stops. A repeated cursor means
    // completeness was never established — the queue must NOT be presented
    // as complete.
    expect(mocks.pendingPage).toHaveBeenCalledTimes(2);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(1);
    // Last pagination metadata is preserved for diagnostics.
    expect(result.pagination).toEqual({ nextCursor: 1, hasMore: true, limit: 1 });
  });

  it('reports truncation on a cyclic cursor (A -> B -> A)', async () => {
    mocks.pendingPage.mockReset();
    mocks.pendingPage.mockImplementation(async (cursor) => {
      if (cursor === null) return page([{ id: 1 }], { nextCursor: 2, hasMore: true, limit: 1 });
      if (cursor === 2) return page([{ id: 2 }], { nextCursor: 1, hasMore: true, limit: 1 });
      return page([{ id: 1 }], { nextCursor: 2, hasMore: true, limit: 1 });
    });

    const result = await fetchPendingWithdrawalQueue({ maxPages: 10 });

    // The cycle never repeats a cursor immediately, so the seenCursors guard
    // is what stops the walk — honestly flagged as truncated.
    expect(mocks.pendingPage).toHaveBeenCalledTimes(3);
    expect(result.truncated).toBe(true);
    expect(result.rows.map((r) => r.id)).toEqual([1, 2]);
  });

  it('preserves the first page authoritative pagination.total across cursor pages', async () => {
    mocks.pendingPage.mockReset();
    mocks.pendingPage
      .mockResolvedValueOnce({
        data: {
          pending: [{ id: 1 }],
          frozen: [],
          counts: { pending: 1, frozen: 0 },
          // Page 1 arrives in offset mode (no cursor requested) and carries
          // the authoritative total for the whole PENDING backlog.
          pagination: { nextCursor: 2, hasMore: true, limit: 100, page: 1, total: 250 },
        },
      })
      .mockResolvedValueOnce(page(
        [{ id: 2 }],
        // Cursor pages omit total.
        { nextCursor: null, hasMore: false, limit: 100 },
      ));

    const result = await fetchPendingWithdrawalQueue();

    expect(result.truncated).toBe(false);
    expect(result.rows).toHaveLength(2);
    // The drained row count is honest, but the backlog total from page 1
    // survives in the metadata for consumers like the dashboard alert.
    expect(result.counts.pending).toBe(2);
    expect(result.pagination.total).toBe(250);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('refuses to fabricate a queue from a malformed page', async () => {
    mocks.pendingPage.mockReset();
    mocks.pendingPage.mockResolvedValue({ data: { frozen: [] } });

    await expect(fetchPendingWithdrawalQueue()).rejects.toThrow(/Malformed pending-withdrawals page/);
  });
});
