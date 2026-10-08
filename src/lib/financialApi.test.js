import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  forceRelease: vi.fn(),
  forceCancel: vi.fn(),
  approveWithdrawal: vi.fn(),
  rejectWithdrawal: vi.fn(),
  resolveEscrow: vi.fn(),
  updateSettings: vi.fn(),
  resolveReviewTransport: vi.fn(),
  needsReviewTransport: vi.fn(),
}));

vi.mock('./api', () => ({
  admin: { stats: vi.fn(), profitBreakdown: vi.fn() },
  escrow: {
    disputes: vi.fn(), resolve: mocks.resolveEscrow, assign: vi.fn(),
  },
  feeProfiles: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), resolve: vi.fn() },
  payouts: { getSettings: vi.fn(), updateSettings: vi.fn(), batchProcess: vi.fn() },
  settings: { get: vi.fn(), update: mocks.updateSettings },
  trades: {
    disputes: vi.fn(), forceRelease: mocks.forceRelease, forceCancel: mocks.forceCancel,
    resolve: vi.fn(), injectMessage: vi.fn(), resolutions: vi.fn(),
  },
  users: { credit: vi.fn() },
  withdrawals: {
    pending: vi.fn(),
    approve: mocks.approveWithdrawal,
    reject: mocks.rejectWithdrawal,
    needsReview: mocks.needsReviewTransport,
    resolveReview: mocks.resolveReviewTransport,
  },
}));

import { financialApi } from './financialApi';

describe('financialApi mutation facade', () => {
  it('validates and forwards force-release with the explicit trade id/reason boundary', () => {
    mocks.forceRelease.mockResolvedValue({ success: true });
    financialApi.disputes.forceRelease('trade-7', 'manual review');
    expect(mocks.forceRelease).toHaveBeenCalledWith('trade-7', 'manual review');
    expect(() => financialApi.disputes.forceRelease('', 'reason')).toThrow();
  });

  it('validates force-cancel identifiers before crossing into the transport layer', () => {
    financialApi.disputes.forceCancel(42, 'cancelled by admin');
    expect(mocks.forceCancel).toHaveBeenCalledWith(42, 'cancelled by admin');
    expect(() => financialApi.disputes.forceCancel(null, 'reason')).toThrow();
  });

  it('keeps withdrawal approval/rejection operations on the narrow facade', () => {
    financialApi.withdrawals.approve('withdrawal-9');
    financialApi.withdrawals.reject('withdrawal-9', 'destination mismatch');
    expect(mocks.approveWithdrawal).toHaveBeenCalledWith('withdrawal-9');
    expect(mocks.rejectWithdrawal).toHaveBeenCalledWith('withdrawal-9', 'destination mismatch');
    expect(() => financialApi.withdrawals.reject('withdrawal-9', 'x'.repeat(1001))).toThrow();
  });

  it('requires complete escrow resolution inputs before transport', () => {
    financialApi.escrow.resolve('dispute-2', 'FULL_RELEASE', 'verified evidence', 0, 100);
    expect(mocks.resolveEscrow).toHaveBeenCalledWith('dispute-2', 'FULL_RELEASE', 'verified evidence', 0, 100);
    expect(() => financialApi.escrow.resolve('dispute-2', 'SPLIT', 'bad split', -1, 101)).toThrow();
  });
});

describe('financialApi withdrawals.resolveReview (NEEDS_MANUAL_REVIEW surface)', () => {
  it('validates the request and forwards action + trimmed reason to the transport', () => {
    mocks.resolveReviewTransport.mockClear().mockResolvedValue({ success: true, message: 'ok', data: { withdrawalId: 31, status: 'PENDING' } });
    financialApi.withdrawals.resolveReview(31, 'RESUME', '  payout never dispatched, verified  ');
    expect(mocks.resolveReviewTransport).toHaveBeenCalledWith(31, { action: 'RESUME', reason: 'payout never dispatched, verified' });
  });

  it('forwards all three actions without touching eligibility (backend adjudicates)', () => {
    mocks.resolveReviewTransport.mockClear();
    for (const action of ['RESUME', 'REJECT', 'ESCALATE']) {
      financialApi.withdrawals.resolveReview('w-1', action, 'operator-reviewed');
    }
    expect(mocks.resolveReviewTransport).toHaveBeenCalledTimes(3);
  });

  it('refuses invalid actions and out-of-range reasons BEFORE the transport layer', async () => {
    mocks.resolveReviewTransport.mockClear();
    await expect(financialApi.withdrawals.resolveReview(31, 'FORCE_REFUND', 'valid reason')).rejects.toThrow();
    await expect(financialApi.withdrawals.resolveReview(31, 'REJECT', 'no')).rejects.toThrow();
    await expect(financialApi.withdrawals.resolveReview(31, 'REJECT', 'x'.repeat(501))).rejects.toThrow();
    expect(mocks.resolveReviewTransport).not.toHaveBeenCalled();
  });

  it('rejects malformed ids', async () => {
    await expect(financialApi.withdrawals.resolveReview('', 'ESCALATE', 'valid reason')).rejects.toThrow();
  });

  it('parses the backend success body against the response contract (drift fails loudly)', async () => {
    mocks.resolveReviewTransport.mockClear().mockResolvedValue({
      success: true,
      message: 'Withdrawal #31 escalated to the reconciliation authority.',
      data: { withdrawalId: 31, status: 'PROCESSING', reason: 'operator-reviewed' },
    });
    const parsed = await financialApi.withdrawals.resolveReview(31, 'ESCALATE', 'operator-reviewed');
    expect(parsed.data.status).toBe('PROCESSING');

    mocks.resolveReviewTransport.mockResolvedValueOnce({ success: true, wrong: 'shape' });
    await expect(financialApi.withdrawals.resolveReview(31, 'ESCALATE', 'operator-reviewed')).rejects.toThrow();
  });
});

describe('financialApi withdrawals.needsReviewList (parked queue listing)', () => {
  it('returns the typed backend body or throws on a lying envelope', async () => {
    const body = {
      success: true,
      withdrawals: [{
        id: 31, amount: '150.00', payoutMethod: 'MOBILE_MONEY', destination: '+233501234567',
        status: 'NEEDS_MANUAL_REVIEW', userId: 88,
        createdAt: '2026-10-08T09:00:00.000Z', updatedAt: '2026-10-08T09:05:00.000Z',
        user: { id: 88, username: 'akosua' },
        manualReview: { reasons: [{ reason: 'AMOUNT_EXCEEDS_THRESHOLD', phase: 'PRE_DISPATCH' }], resolutionOptions: ['ESCALATE'] },
      }],
      count: 1,
      pagination: { nextCursor: null, hasMore: false, limit: 50, page: 1, total: 1 },
    };
    mocks.needsReviewTransport.mockResolvedValue(body);
    const parsed = await financialApi.withdrawals.needsReviewList();
    expect(parsed.withdrawals).toHaveLength(1);
    expect(parsed.withdrawals[0].manualReview.reasons[0].reason).toBe('AMOUNT_EXCEEDS_THRESHOLD');

    mocks.needsReviewTransport.mockResolvedValueOnce({ success: true, withdrawals: 'not-an-array', count: 0, pagination: {} });
    await expect(financialApi.withdrawals.needsReviewList()).rejects.toThrow();
  });
});
