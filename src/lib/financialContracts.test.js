import { describe, expect, it } from 'vitest';
import {
  forceTradeActionSchema,
  withdrawalPendingResponseSchema,
} from './financialContracts';

const pendingWithdrawal = {
  id: 101,
  amount: 25.5,
  payoutMethod: 'MTN_MOMO',
  network: 'MTN',
  destination: '0240000000',
  totalGasFee: 0,
  vendorGasShare: 0,
  adminGasShare: 0,
  status: 'PENDING',
  userId: 7,
  createdAt: '2026-08-31T20:00:00.000Z',
  updatedAt: '2026-08-31T20:00:01.000Z',
  user: {
    id: 7,
    username: 'vendor',
    email: 'vendor@example.com',
    kycStatus: 'VERIFIED',
    banStatus: 'ACTIVE',
    strikeCount: 0,
    tradesCompleted: 18,
  },
};

describe('Admin financial response contracts', () => {
  it('accepts a real pending-withdrawal response with a transaction-history frozen row', () => {
    const response = {
      success: true,
      data: {
        pending: [pendingWithdrawal],
        frozen: [
          {
            id: 9001,
            status: 'FROZEN_DISPUTE',
            amountUsdc: 45,
            feeUsdc: 0,
            type: 'WITHDRAWAL',
            txHash: 'frozen-ref-1',
            createdAt: '2026-08-31T19:00:00.000Z',
            user: {
              id: 7,
              username: 'vendor',
              email: 'vendor@example.com',
            },
          },
        ],
        counts: { pending: 1, frozen: 1 },
        pagination: {
          nextCursor: null,
          hasMore: false,
          limit: 100,
          page: 1,
          total: 1,
        },
      },
    };

    expect(() => withdrawalPendingResponseSchema.parse(response)).not.toThrow();
  });

  it('preserves strict pending withdrawal validation while allowing frozen history fields to evolve', () => {
    const base = {
      success: true,
      data: {
        pending: [pendingWithdrawal],
        frozen: [{
          id: 'history-1',
          status: 'FROZEN_DISPUTE',
          transactionType: 'WITHDRAWAL',
          user: null,
        }],
        counts: { pending: 1, frozen: 1 },
        pagination: { nextCursor: null, hasMore: false, limit: 100, total: 1 },
      },
    };

    expect(withdrawalPendingResponseSchema.parse(base).data.frozen[0]).toMatchObject({
      id: 'history-1',
      status: 'FROZEN_DISPUTE',
      transactionType: 'WITHDRAWAL',
    });

    const invalid = structuredClone(base);
    delete invalid.data.pending[0].destination;
    expect(() => withdrawalPendingResponseSchema.parse(invalid)).toThrow();
  });

  it('keeps force trade action input validation independent of the backend transport field name', () => {
    expect(forceTradeActionSchema.parse({ tradeId: 42, reason: 'manual review' })).toEqual({
      tradeId: 42,
      reason: 'manual review',
    });
  });
});
