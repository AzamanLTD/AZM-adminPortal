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
  reason: z.string().trim().max(2000).optional(),
}).strict();

export const forceTradeActionSchema = z.object({
  tradeId: tradeIdSchema,
  reason: z.string().trim().max(2000).optional(),
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

/**
 * Producer-backed contract for GET /api/admin/disputes.
 * The Backend controller returns `success`, `disputes`, and a pagination
 * envelope; each dispute includes the participants and messages used by the
 * War Room consumer. Additional provider fields remain open so the contract
 * protects the fields the consumer relies on without inventing a full Trade model.
 */
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

/**
 * Producer-backed contract for GET /api/admin/escrow-disputes.
 * The Backend controller returns `success`, an escrow-dispute array, and the
 * shared cursor/offset pagination envelope from utils/pagination.js.
 */
export const escrowDisputeListResponseSchema = z.object({
  success: z.literal(true),
  disputes: z.array(escrowDisputeSchema),
  pagination: cursorPaginationSchema,
}).passthrough();

/**
 * @typedef {import('zod').infer<typeof forceReleaseSchema>} ForceReleaseInput
 * @typedef {import('zod').infer<typeof forceTradeActionSchema>} ForceTradeActionInput
 * @typedef {import('zod').infer<typeof adminCreditSchema>} AdminCreditInput
 * @typedef {import('zod').infer<typeof reasonSchema>} ReasonInput
 * @typedef {import('zod').infer<typeof escrowResolveSchema>} EscrowResolveInput
 * @typedef {import('zod').infer<typeof disputeListResponseSchema>} DisputeListResponse
 * @typedef {import('zod').infer<typeof escrowDisputeListResponseSchema>} EscrowDisputeListResponse
 */

/** @typedef {{
 * statusCode?: number,
 * violations?: unknown,
 * tier?: unknown,
 * stakedBalance?: unknown
 * }} AdminApiErrorDetails */

/** @typedef {Error & AdminApiErrorDetails} AdminApiError */

/**
 * @param {unknown} error
 * @returns {error is AdminApiError}
 */
export function isAdminApiError(error) {
  return error instanceof Error && (
    typeof error.statusCode === 'number' ||
    'violations' in error ||
    'tier' in error ||
    'stakedBalance' in error
  );
}
