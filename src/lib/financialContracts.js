import { z } from 'zod';

/**
 * Canonical request contracts for Admin financial actions.
 * These schemas describe fields already sent by the existing Admin API layer.
 * Response schemas are intentionally deferred until their consumers are
 * audited against the Backend controllers, avoiding invented contracts.
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

/**
 * @typedef {import('zod').infer<typeof forceReleaseSchema>} ForceReleaseInput
 * @typedef {import('zod').infer<typeof forceTradeActionSchema>} ForceTradeActionInput
 * @typedef {import('zod').infer<typeof adminCreditSchema>} AdminCreditInput
 * @typedef {import('zod').infer<typeof reasonSchema>} ReasonInput
 * @typedef {import('zod').infer<typeof escrowResolveSchema>} EscrowResolveInput
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
