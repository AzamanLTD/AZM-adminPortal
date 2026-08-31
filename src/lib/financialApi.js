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
  userIdSchema,
  withdrawalPendingResponseSchema,
} from './financialContracts';

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
    get: () => settings.get(),
    update: (data) => settings.update(data),
  },

  fees: {
    list: () => feeProfiles.list(),
    create: (data) => feeProfiles.create(data),
    update: (id, data) => feeProfiles.update(id, data),
    delete: (id) => feeProfiles.delete(id),
    resolve: (context) => feeProfiles.resolve(context),
  },

  disputes: {
    list: async (page = 1) => {
      const data = await trades.disputes(page);
      return parse(disputeListResponseSchema, data);
    },
    forceRelease: (tradeId, reason) => {
      const input = parse(forceReleaseSchema, { tradeId, reason });
      return trades.forceRelease(input.tradeId, input.reason);
    },
    forceCancel: (tradeId, reason) => {
      const input = parse(forceTradeActionSchema, { tradeId, reason });
      return trades.forceCancel(input.tradeId, input.reason);
    },
    resolve: (tradeId, ruling, reason, buyerPercent, override) =>
      trades.resolve(tradeId, ruling, reason, buyerPercent, override),
    injectMessage: (tradeId, message) => trades.injectMessage(tradeId, message),
    resolutions: () => trades.resolutions(),
  },

  withdrawals: {
    pending: async () => {
      const data = await withdrawals.pending();
      return parse(withdrawalPendingResponseSchema, data);
    },
    approve: (id) => withdrawals.approve(parse(userIdSchema, id)),
    reject: (id, reason) => {
      const input = parse(reasonSchema, { reason });
      return withdrawals.reject(parse(userIdSchema, id), input.reason);
    },
    needsReview: () => withdrawals.needsReview(),
  },

  payouts: {
    settings: async () => {
      const data = await payouts.getSettings();
      return parse(payoutSettingsResponseSchema, data);
    },
    updateSettings: (data) => {
      const input = parse(payoutSettingsUpdateSchema, data);
      return payouts.updateSettings(input);
    },
    batchProcess: () => payouts.batchProcess(),
  },

  userCredit: (id, amount, reason) => {
    const input = parse(adminCreditSchema, { amount, reason });
    return users.credit(parse(userIdSchema, id), input.amount);
  },

  escrow: {
    disputes: async (status) => {
      const data = await escrow.disputes(status);
      return parse(escrowDisputeListResponseSchema, data);
    },
    resolve: (disputeId, ruling, rulingNotes, payerPct, payeePct) => {
      const input = parse(escrowResolveSchema, {
        disputeId,
        ruling,
        rulingNotes,
        payerPct,
        payeePct,
      });
      return escrow.resolve(
        input.disputeId,
        input.ruling,
        input.rulingNotes,
        input.payerPct,
        input.payeePct,
      );
    },
    assign: (disputeId, assignedToId) => escrow.assign(disputeId, assignedToId),
  },
};
