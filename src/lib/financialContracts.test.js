import { describe, expect, it } from 'vitest';
import {
  escrowDisputeListResponseSchema,
  forceTradeActionSchema,
  manualReviewEvidenceSchema,
  needsReviewListResponseSchema,
  resolveReviewRequestSchema,
  resolveReviewResponseSchema,
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

// ── NEEDS_MANUAL_REVIEW list + resolution contracts (backend PR #325) ──────
describe('needsReviewListResponseSchema (GET /api/admin/payouts/needs-review)', () => {
  const parkedRow = {
    id: 31,
    amount: '150.00',
    payoutMethod: 'MOBILE_MONEY',
    destination: '+233501234567',
    status: 'NEEDS_MANUAL_REVIEW',
    userId: 88,
    createdAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-10-08T09:05:00.000Z',
    user: { id: 88, username: 'akosua', email: 'a@example.com', kycStatus: 'VERIFIED', banStatus: null, tradesCompleted: 12 },
    manualReview: {
      reasons: [
        { reason: 'AMOUNT_EXCEEDS_THRESHOLD', phase: 'PRE_DISPATCH', reference: 'TX-9001', firstSeenAt: '2026-10-08T09:00:01.000Z', lastSeenAt: '2026-10-08T09:04:00.000Z' },
      ],
      resolutionOptions: ['ESCALATE'],
    },
  };

  it('parses the exact backend envelope (withdrawals + count + cursor pagination with total)', () => {
    const body = {
      success: true,
      withdrawals: [parkedRow],
      count: 1,
      // no-params first page arrives in offset mode and carries the total
      pagination: { nextCursor: null, hasMore: false, limit: 50, page: 1, total: 1 },
    };
    const parsed = needsReviewListResponseSchema.parse(body);
    expect(parsed.withdrawals[0].manualReview.reasons[0].phase).toBe('PRE_DISPATCH');
    expect(parsed.pagination.total).toBe(1);
  });

  it('parses rows parked without any manualReview evidence (pre-evidence-fix rows)', () => {
    const body = {
      success: true,
      withdrawals: [{ ...parkedRow, manualReview: null }],
      count: 1,
      pagination: { nextCursor: null, hasMore: false, limit: 50 },
    };
    expect(() => needsReviewListResponseSchema.parse(body)).not.toThrow();
  });

  it('parses partial evidence (reason without a phase) without inventing safety', () => {
    const evidence = {
      reasons: [{ reason: 'DISPATCH_IDENTITY_UNKNOWN' }],
      resolutionOptions: ['ESCALATE'],
    };
    const parsed = manualReviewEvidenceSchema.parse(evidence);
    expect(parsed.reasons[0].phase).toBeUndefined();
    expect(parsed.resolutionOptions).toEqual(['ESCALATE']);
  });

  it('refuses a lying envelope (success: false or missing withdrawals array)', () => {
    expect(() => needsReviewListResponseSchema.parse({ success: false, withdrawals: [], count: 0, pagination: {} })).toThrow();
    expect(() => needsReviewListResponseSchema.parse({ success: true, count: 0, pagination: {} })).toThrow();
  });
});

describe('resolveReviewRequestSchema (POST /api/admin/withdrawals/:id/resolve-review)', () => {
  it('accepts all three actions with a 3–500 char reason and trims the reason', () => {
    for (const action of ['RESUME', 'REJECT', 'ESCALATE']) {
      const parsed = resolveReviewRequestSchema.parse({ action, reason: '  reviewed against provider evidence  ' });
      expect(parsed.action).toBe(action);
      expect(parsed.reason).toBe('reviewed against provider evidence');
    }
  });

  it('rejects unknown actions and out-of-range reasons, mirroring the backend wire rule', () => {
    expect(() => resolveReviewRequestSchema.parse({ action: 'REFUND', reason: 'valid reason' })).toThrow();
    expect(() => resolveReviewRequestSchema.parse({ action: 'RESUME', reason: 'no' })).toThrow();
    expect(() => resolveReviewRequestSchema.parse({ action: 'RESUME', reason: 'x'.repeat(501) })).toThrow();
  });
});

describe('resolveReviewResponseSchema (200 from resolve-review)', () => {
  it('parses the RESUME response (status PENDING) and the ESCALATE response (status PROCESSING)', () => {
    expect(resolveReviewResponseSchema.parse({
      success: true,
      message: 'Withdrawal #31 resumed into the payout pipeline.',
      data: { withdrawalId: 31, status: 'PENDING', reason: 'ok' },
    }).data.status).toBe('PENDING');
    expect(resolveReviewResponseSchema.parse({
      success: true,
      message: 'Withdrawal #31 escalated to the reconciliation authority.',
      data: { withdrawalId: 31, status: 'PROCESSING', reason: 'ok' },
    }).data.status).toBe('PROCESSING');
  });

  it('parses the REJECT response with the refunded amount and canonical reference', () => {
    const parsed = resolveReviewResponseSchema.parse({
      success: true,
      message: 'Withdrawal #31 rejected from manual review. Funds refunded through the canonical reversal state machine.',
      data: { withdrawalId: 31, userId: 88, amount: '150.00', reason: 'ok', canonicalReference: 'TX-9001', refundedAmount: '150.00' },
    });
    expect(parsed.data.refundedAmount).toBe('150.00');
    expect(parsed.data.canonicalReference).toBe('TX-9001');
  });
});
