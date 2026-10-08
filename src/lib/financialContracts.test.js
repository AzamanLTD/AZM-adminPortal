import { describe, expect, it } from 'vitest';
import {
  escrowDisputeListResponseSchema,
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


describe('escrow dispute list contract', () => {
  const backendDispute = {
    id: 5,
    escrowId: 9,
    status: 'PENDING',
    reason: 'goods not delivered',
    ruling: null,
    rulingNotes: null,
    payerPct: null,
    payeePct: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    raisedBy: { id: 3, username: 'payer' },
    assignedTo: null,
    escrow: {
      id: 9,
      ticketId: 4,
      status: 'DISPUTED',
      amountUsdc: '120.50',
      feeUsdc: '1.20',
      payer: { id: 3, username: 'payer' },
      payee: { id: 4, username: 'payee' },
      ticket: { id: 4, name: 'iPhone 15', status: 'ESCROWED' },
    },
  };

  it('accepts the exact backend offset envelope for GET /api/admin/escrow-disputes', () => {
    // adminController.getEscrowDisputes returns { page, limit, total, totalPages }.
    const response = {
      success: true,
      disputes: [backendDispute],
      pagination: { page: 1, limit: 100, total: 57, totalPages: 1 },
    };
    expect(() => escrowDisputeListResponseSchema.parse(response)).not.toThrow();
  });

  it('parses a realistic multi-page response without losing disputes', () => {
    const response = {
      success: true,
      disputes: [backendDispute],
      pagination: { page: 2, limit: 20, total: 57, totalPages: 3 },
    };
    const parsed = escrowDisputeListResponseSchema.parse(response);
    expect(parsed.disputes).toHaveLength(1);
    expect(parsed.pagination.page).toBe(2);
    expect(parsed.pagination.total).toBe(57);
  });

  it('still rejects an envelope that lies about completeness', () => {
    // No page/limit/total — the operator UI cannot show honest pagination.
    const response = {
      success: true,
      disputes: [],
      pagination: {},
    };
    expect(() => escrowDisputeListResponseSchema.parse(response)).toThrow();
  });
});

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

  it('enforces the Backend adminNotes 1000-character boundary', () => {
    const accepted = 'x'.repeat(1000);
    const rejected = 'x'.repeat(1001);

    expect(forceTradeActionSchema.parse({ tradeId: 42, reason: accepted }).reason).toHaveLength(1000);
    expect(() => forceTradeActionSchema.parse({ tradeId: 42, reason: rejected })).toThrow();
  });
});
