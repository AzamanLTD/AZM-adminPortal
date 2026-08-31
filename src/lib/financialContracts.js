/**
 * Canonical client-side contracts for Admin financial API boundaries.
 *
 * This file intentionally contains only shapes established by the existing
 * Admin API call sites and Backend force-release contract. Endpoint-specific
 * response models are introduced incrementally as their consumers are audited.
 */

/** @typedef {'DISPUTED'|'PAID'|'COMPLETED'|'CANCELLED'} TradeStatus */

/** @typedef {{
 *  statusCode?: number,
 *  violations?: unknown,
 *  tier?: unknown,
 *  stakedBalance?: unknown
 * }} AdminApiErrorDetails */

/**
 * @typedef {Error & AdminApiErrorDetails} AdminApiError
 */

/** @typedef {{tradeId: number|string, reason?: string}} ForceTradeActionInput */

/** @typedef {{
 *  tradeId: number|string,
 *  reason?: string,
 *  adminNotes?: string
 * }} ForceReleaseInput */

/** @typedef {{
 *  success: boolean,
 *  message: string,
 *  data?: unknown
 * }} ForceTradeActionResponse */

/** @typedef {{
 *  success: boolean,
 *  trades: unknown[],
 *  pagination?: unknown
 * }} LiveTradesResponse */

/** @typedef {{
 *  success: boolean,
 *  message?: string,
 *  data?: unknown,
 *  pagination?: unknown
 * }} FinancialApiResponse */

/** @typedef {{
 *  amount: number|string,
 *  reason?: string
 * }} AdminCreditInput */

/** @typedef {{
 *  reason?: string
 * }} ReasonInput */

/** @typedef {{
 *  id: number|string,
 *  amount?: number|string,
 *  status?: string,
 *  reason?: string
 * }} FinancialRecord */

/**
 * Runtime guard for the error contract produced by src/lib/api.js.
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
