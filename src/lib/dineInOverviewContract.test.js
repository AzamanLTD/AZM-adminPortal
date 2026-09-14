import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * Contract test: the Admin dine-in lifecycle projection must be fetched from
 * the backend-authoritative endpoint with no client-side aggregation. The
 * endpoint returns { success, overview }; the hook normalizes `overview`.
 */

const fetchMock = vi.fn();

vi.stubGlobal('fetch', (...args) => fetchMock(...args));

const { admin } = await import('./api');

describe('admin dine-in overview contract', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the server-computed lifecycle projection endpoint', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        overview: {
          tabsByStatus: { OPEN: 2, FINALIZED: 1, CLOSED: 4, CANCELLED: 0 },
          openTabs: 2,
          finalizedTabs: 1,
          closedToday: 1,
          volume24h: { totalUsdc: 128.5, tipsUsdc: 6.25 },
          recentTabs: [],
          currencies: { crypto: 'USDC' },
          generatedAt: '2026-09-14T08:00:00.000Z',
        },
      }),
    });

    const payload = await admin.dineInOverview();

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/admin/dine-in/overview');
    expect(options?.method || 'GET').toBe('GET');

    expect(payload.success).toBe(true);
    expect(payload.overview.tabsByStatus).toEqual({
      OPEN: 2, FINALIZED: 1, CLOSED: 4, CANCELLED: 0,
    });
    expect(payload.overview.volume24h).toEqual({ totalUsdc: 128.5, tipsUsdc: 6.25 });
    // The full lifecycle shape is always present — empty states are zeroed
    // server-side, so the dashboard never invents or truncates counts.
    expect(Object.keys(payload.overview.tabsByStatus)).toEqual(
      expect.arrayContaining(['OPEN', 'FINALIZED', 'CLOSED', 'CANCELLED']),
    );
  });
});
