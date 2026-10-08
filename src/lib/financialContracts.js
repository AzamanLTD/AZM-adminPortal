import { z } from 'zod';

/**
 * Canonical request contracts for Admin financial actions.
 * These schemas describe fields already sent by the existing Admin API layer.
 * Response schemas are added only after the Backend producer has been audited.
 */

export const idSchema = z.union([
  z.string().min(1),
  z.number().int().positive(),
]);

export const tradeIdSchema = idSchema;
export const userIdSchema = idSchema;

export const reasonSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
}).strict();

export const forceTradeActionSchema = z.object({
  tradeId: tradeIdSchema,
  reason: z.string().trim().max(1000).optional(),
}).strict();

export const forceReleaseSchema = forceTradeActionSchema;

export const adminCreditSchema = z.object({
  amount: z.union([z.number().finite(), z.string().min(1)]),
  reason: z.string().trim().max(2000).optional(),
}).strict();

export const escrowResolveSchema = z.object({
  disputeId: idSchema,
  ruling: z.string().min(1),
  rulingNotes: z.string().trim().max(5000).optional(),
  payerPct: z.number().min(0).max(100),
  payeePct: z.number().min(0).max(100),
});

const disputeParticipantSchema = z.object({
  id: idSchema,
  username: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
}).passthrough();

const disputeMessageSchema = z.object({
  id: idSchema.optional(),
  sender: z.string().optional(),
  text: z.string().optional(),
}).passthrough();

export const disputeListResponseSchema = z.object({
  success: z.literal(true),
  disputes: z.array(z.object({
    id: idSchema,
    status: z.string(),
    user: disputeParticipantSchema,
    vendor: disputeParticipantSchema,
    messages: z.array(disputeMessageSchema),
  }).passthrough()),
  pagination: z.unknown().optional(),
}).passthrough();

const escrowParticipantSchema = z.object({
  id: idSchema,
  username: z.string().nullable().optional(),
}).passthrough();

const escrowTicketSchema = z.object({
  id: idSchema,
  name: z.string().nullable().optional(),
  status: z.string().optional(),
}).passthrough();

const escrowDisputeSchema = z.object({
  id: idSchema,
  escrowId: idSchema,
  status: z.string(),
  reason: z.string().nullable().optional(),
  ruling: z.string().nullable().optional(),
  rulingNotes: z.string().nullable().optional(),
  payerPct: z.number().nullable().optional(),
  payeePct: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  resolvedAt: z.string().nullable().optional(),
  raisedBy: escrowParticipantSchema.nullable().optional(),
  assignedTo: escrowParticipantSchema.nullable().optional(),
  escrow: z.object({
    id: idSchema,
    ticketId: idSchema,
    status: z.string(),
    amountUsdc: z.union([z.number().finite(), z.string().min(1)]),
    feeUsdc: z.union([z.number().finite(), z.string().min(1)]),
    fundedAt: z.string().nullable().optional(),
    payer: escrowParticipantSchema.nullable().optional(),
    payee: escrowParticipantSchema.nullable().optional(),
    ticket: escrowTicketSchema.nullable().optional(),
  }).passthrough(),
}).passthrough();

const cursorPaginationSchema = z.object({
  nextCursor: idSchema.nullable(),
  hasMore: z.boolean(),
  limit: z.number().int().positive(),
  page: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
}).passthrough();

// GET /api/admin/escrow-disputes is an OFFSET-paginated list on the backend
// (adminController.getEscrowDisputes returns { page, limit, total, totalPages }).
// It never emits nextCursor/hasMore. The previous schema asserted the cursor
// envelope here, which made every parse of a real backend response throw and
// the EscrowDisputes page fail into a silent "empty queue".
export const offsetPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}).passthrough();

export const escrowDisputeListResponseSchema = z.object({
  success: z.literal(true),
  disputes: z.array(escrowDisputeSchema),
  pagination: offsetPaginationSchema,
}).passthrough();

const withdrawalUserSchema = z.object({
  id: idSchema.optional(),
  username: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  kycStatus: z.string().nullable().optional(),
  banStatus: z.string().nullable().optional(),
  strikeCount: z.number().int().nonnegative().optional(),
  tradesCompleted: z.number().int().nonnegative().optional(),
}).passthrough();

const withdrawalSchema = z.object({
  id: idSchema,
  amount: z.union([z.number().finite(), z.string().min(1)]),
  payoutMethod: z.string(),
  network: z.string().nullable().optional(),
  destination: z.string(),
  totalGasFee: z.union([z.number().finite(), z.string().min(1)]).nullable().optional(),
  vendorGasShare: z.union([z.number().finite(), z.string().min(1)]).nullable().optional(),
  adminGasShare: z.union([z.number().finite(), z.string().min(1)]).nullable().optional(),
  status: z.string(),
  userId: idSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  user: withdrawalUserSchema.nullable().optional(),
}).passthrough();

const frozenWithdrawalSchema = z.object({
  id: idSchema,
  status: z.string(),
  user: withdrawalUserSchema.nullable().optional(),
}).passthrough();

const withdrawalPaginationSchema = z.object({
  nextCursor: idSchema.nullable(),
  hasMore: z.boolean(),
  limit: z.number().int().positive(),
  page: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
}).passthrough();

export const withdrawalPendingResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    pending: z.array(withdrawalSchema),
    frozen: z.array(frozenWithdrawalSchema),
    counts: z.object({
      pending: z.number().int().nonnegative(),
      frozen: z.number().int().nonnegative(),
    }).passthrough(),
    pagination: withdrawalPaginationSchema,
  }).passthrough(),
}).passthrough();

// ── NEEDS_MANUAL_REVIEW resolution (backend PR #325, 2026-10-08) ─────────────
// POST /api/admin/withdrawals/:id/resolve-review
// Body: { action: RESUME | REJECT | ESCALATE, reason: 3–500 chars }.
// The backend is the sole authority on whether RESUME/REJECT is safe (it
// proves pre-dispatch safety from durable evidence). The portal validates
// only the documented wire shape — never the safety predicates.
export const resolveReviewRequestSchema = z.object({
  action: z.enum(['RESUME', 'REJECT', 'ESCALATE']),
  reason: z.string().trim().min(3).max(500),
}).strict();

// Durable parking evidence attached per-row by the backend on
// GET /api/admin/payouts/needs-review. Rows parked before the fail-closed
// evidence fix carry reasons without a phase — partial evidence parses, and
// the portal must never present it as proof of safety.
const manualReviewEvidenceReasonSchema = z.object({
  reason: z.string(),
  phase: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  firstSeenAt: z.string().nullable().optional(),
  lastSeenAt: z.string().nullable().optional(),
}).passthrough();

export const manualReviewEvidenceSchema = z.object({
  reasons: z.array(manualReviewEvidenceReasonSchema),
  resolutionOptions: z.array(z.enum(['RESUME', 'REJECT', 'ESCALATE'])),
}).passthrough();

const needsReviewWithdrawalSchema = z.object({
  ...withdrawalSchema.shape,
  manualReview: manualReviewEvidenceSchema.nullable().optional(),
}).passthrough();

// GET /api/admin/payouts/needs-review → { success, withdrawals, count,
// pagination } — same buildPageEnvelope cursor contract as the pending
// endpoint (offset-mode page 1 when called without params carries total).
export const needsReviewListResponseSchema = z.object({
  success: z.literal(true),
  withdrawals: z.array(needsReviewWithdrawalSchema),
  count: z.number().int().nonnegative(),
  pagination: withdrawalPaginationSchema,
}).passthrough();

// 200 responses from the resolve endpoint. status is the post-resolution
// server status (PENDING after RESUME, PROCESSING after ESCALATE, REJECTED +
// refundedAmount after REJECT). It is recorded, never optimistically
// fabricated by the portal.
export const resolveReviewResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    withdrawalId: idSchema,
    status: z.string().optional(),
    reason: z.string().optional(),
    userId: idSchema.optional(),
    amount: z.union([z.number().finite(), z.string().min(1)]).optional(),
    canonicalReference: z.string().nullable().optional(),
    refundedAmount: z.union([z.number().finite(), z.string().min(1)]).nullable().optional(),
  }).passthrough().optional(),
}).passthrough();

const payoutSettingsSchema = z.object({
  autoPayoutEnabled: z.boolean(),
  autoPayoutThresholdUsdc: z.number().finite().nonnegative(),
  autoPayoutMaxAmountUsdc: z.number().finite().nonnegative(),
  autoPayoutIntervalMs: z.number().int().min(10000),
}).strict();

export const payoutSettingsResponseSchema = z.object({
  success: z.literal(true),
  settings: payoutSettingsSchema,
  pool: z.object({
    balance: z.number().finite().nonnegative(),
    alertThreshold: z.number().finite().nonnegative(),
  }).strict(),
}).strict();

export const payoutSettingsUpdateSchema = z.object({
  autoPayoutEnabled: z.boolean().optional(),
  autoPayoutThresholdUsdc: z.number().finite().nonnegative().optional(),
  autoPayoutMaxAmountUsdc: z.number().finite().nonnegative().optional(),
  autoPayoutIntervalMs: z.number().int().min(10000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one payout setting is required.',
});

/**
 * @typedef {import('zod').infer<typeof forceReleaseSchema>} ForceReleaseInput
 * @typedef {import('zod').infer<typeof forceTradeActionSchema>} ForceTradeActionInput
 * @typedef {import('zod').infer<typeof adminCreditSchema>} AdminCreditInput
 * @typedef {import('zod').infer<typeof reasonSchema>} ReasonInput
 * @typedef {import('zod').infer<typeof escrowResolveSchema>} EscrowResolveInput
 * @typedef {import('zod').infer<typeof disputeListResponseSchema>} DisputeListResponse
 * @typedef {import('zod').infer<typeof escrowDisputeListResponseSchema>} EscrowDisputeListResponse
 * @typedef {import('zod').infer<typeof withdrawalPendingResponseSchema>} WithdrawalPendingResponse
 * @typedef {import('zod').infer<typeof payoutSettingsResponseSchema>} PayoutSettingsResponse
 * @typedef {import('zod').infer<typeof needsReviewListResponseSchema>} NeedsReviewListResponse
 * @typedef {import('zod').infer<typeof resolveReviewRequestSchema>} ResolveReviewRequest
 * @typedef {import('zod').infer<typeof resolveReviewResponseSchema>} ResolveReviewResponse
 * @typedef {import('zod').infer<typeof payoutSettingsUpdateSchema>} PayoutSettingsUpdate
 */

/** @typedef {{
 * statusCode?: number,
 * violations?: unknown,
 * tier?: unknown,
 * stakedBalance?: unknown
 * }} AdminApiErrorDetails */

/** @typedef {Error & AdminApiErrorDetails} AdminApiError */

export function isAdminApiError(error) {
  if (!(error instanceof Error)) return false;
  const details = /** @type {AdminApiErrorDetails} */ (error);
  return typeof details.statusCode === 'number' ||
    'violations' in details ||
    'tier' in details ||
    'stakedBalance' in details;
}
