import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  forceRelease: vi.fn(),
  forceCancel: vi.fn(),
  approveWithdrawal: vi.fn(),
  rejectWithdrawal: vi.fn(),
  resolveEscrow: vi.fn(),
  updateSettings: vi.fn(),
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
  withdrawals: { pending: vi.fn(), approve: mocks.approveWithdrawal, reject: mocks.rejectWithdrawal, needsReview: vi.fn() },
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
