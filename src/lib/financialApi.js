import { escrow, feeProfiles, payouts, settings, trades, admin, users, withdrawals } from './api';
import {
  adminCreditSchema,
  disputeListResponseSchema,
  escrowDisputeListResponseSchema,
  escrowResolveSchema,
  forceReleaseSchema,
  forceTradeActionSchema,
  payoutSettingsResponseSchema,
  payoutSettingsUpdateSchema,
  reasonSchema,
  needsReviewListResponseSchema,
  resolveReviewRequestSchema,
  resolveReviewResponseSchema,
  userIdSchema,
  withdrawalPendingResponseSchema,
} from './financialContracts';
import { feeProfileListResponseSchema, feeProfileWriteSchema } from './feeContracts';
import { adminSettingsResponseSchema, adminSettingsUpdateSchema } from './settingsContracts';

const parse = (schema, value) => schema.parse(value);

/**
 * Narrow facade for high-risk Admin financial operations.
 * Existing consumers can migrate one surface at a time without changing the
 * underlying transport/authentication implementation in api.js.
 */
export const financialApi = {
  stats: () => admin.stats(),
  profitBreakdown: () => admin.profitBreakdown(),

  settings: {
    get: /** @returns {Promise<import('./settingsTypes').AdminSettingsResponse>} */ async () => parse(adminSettingsResponseSchema, await settings.get()),
    update: /** @param {import('./settingsTypes').AdminSettingsUpdate} data */ (data) => settings.update(parse(adminSettingsUpdateSchema, data)),
  },

  fees: {
    list: async () => parse(feeProfileListResponseSchema, await feeProfiles.list()),
    create: (data) => feeProfiles.create(parse(feeProfileWriteSchema, data)),
    update: (id, data) => feeProfiles.update(parse(userIdSchema, id), parse(feeProfileWriteSchema, data)),
    delete: (id) => feeProfiles.delete(parse(userIdSchema, id)),
    resolve: (context) => feeProfiles.resolve(context),
  },

  disputes: {
    list: async (page = 1) => parse(disputeListResponseSchema, await trades.disputes(page)),
    forceRelease: (tradeId, reason) => { const input = parse(forceReleaseSchema, { tradeId, reason }); return trades.forceRelease(input.tradeId, input.reason); },
    forceCancel: (tradeId, reason) => { const input = parse(forceTradeActionSchema, { tradeId, reason }); return trades.forceCancel(input.tradeId, input.reason); },
    resolve: (tradeId, ruling, reason, buyerPercent, override) => trades.resolve(tradeId, ruling, reason, buyerPercent, override),
    injectMessage: (tradeId, message) => trades.injectMessage(tradeId, message),
    resolutions: () => trades.resolutions(),
  },

  withdrawals: {
    pending: async () => parse(withdrawalPendingResponseSchema, await withdrawals.pending()),
    // One page of the cursor-paginated pending queue. Cursor = last row id
    // from the previous page's pagination.nextCursor.
    pendingPage: async (cursor) => parse(withdrawalPendingResponseSchema, await withdrawals.pending(cursor)),
    approve: (id) => withdrawals.approve(parse(userIdSchema, id)),
    reject: (id, reason) => { const input = parse(reasonSchema, { reason }); return withdrawals.reject(parse(userIdSchema, id), input.reason); },
    needsReview: () => withdrawals.needsReview(),
    // Typed needs-review list (GET /api/admin/payouts/needs-review). The
    // backend defaults to limit 50 with the cursor envelope; page 1 carries
    // the authoritative `total`.
    needsReviewList: async () => parse(needsReviewListResponseSchema, await withdrawals.needsReview()),
    // POST /api/admin/withdrawals/:id/resolve-review — action + mandatory
    // human reason. Eligibility is proven by the backend at resolve time.
    resolveReview: async (id, action, reason) => {
      const input = parse(resolveReviewRequestSchema, { action, reason });
      const response = await withdrawals.resolveReview(parse(userIdSchema, id), { action: input.action, reason: input.reason });
      // Parse the success body against the contract so backend drift fails
      // loudly here instead of silently rendering a wrong state.
      return parse(resolveReviewResponseSchema, response);
    },
  },

  payouts: {
    settings: async () => parse(payoutSettingsResponseSchema, await payouts.getSettings()),
    updateSettings: (data) => payouts.updateSettings(parse(payoutSettingsUpdateSchema, data)),
    batchProcess: () => payouts.batchProcess(),
  },

  userCredit: (id, amount, reason) => { const input = parse(adminCreditSchema, { amount, reason }); return users.credit(parse(userIdSchema, id), input.amount); },

  escrow: {
    disputes: async (status, page = 1, limit = 100) => parse(escrowDisputeListResponseSchema, await escrow.disputes(status, page, limit)),
    resolve: (disputeId, ruling, rulingNotes, payerPct, payeePct) => { const input = parse(escrowResolveSchema, { disputeId, ruling, rulingNotes, payerPct, payeePct }); return escrow.resolve(input.disputeId, input.ruling, input.rulingNotes, input.payerPct, input.payeePct); },
    assign: (disputeId, assignedToId) => escrow.assign(disputeId, assignedToId),
  },
};
