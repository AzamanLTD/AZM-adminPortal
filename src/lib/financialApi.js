import { escrow, feeProfiles, payouts, settings, trades, withdrawals, admin } from './api';
import {
  adminCreditSchema,
  forceReleaseSchema,
  forceTradeActionSchema,
  reasonSchema,
} from './financialContracts';

const parse = (schema, value) => schema.parse(value);

/**
 * Narrow facade for high-risk Admin financial operations.
 *
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
    list: (page = 1) => trades.disputes(page),
    forceRelease: (tradeId, reason) => {
      const input = parse(forceReleaseSchema, { tradeId, reason });
      return trades.forceRelease(input.tradeId, input.reason);
    },
    forceCancel: (tradeId, reason) => {
      const input = parse(forceTradeActionSchema, { tradeId, reason });
      return trades.forceCancel(input.tradeId, input.reason);
    },
  },

  withdrawals: {
    pending: () => withdrawals.pending(),
    approve: (id) => withdrawals.approve(id),
    reject: (id, reason) => {
      const input = parse(reasonSchema, { reason });
      return withdrawals.reject(id, input.reason);
    },
    needsReview: () => withdrawals.needsReview(),
  },

  payouts: {
    settings: () => payouts.getSettings(),
    updateSettings: (data) => payouts.updateSettings(data),
    batchProcess: () => payouts.batchProcess(),
  },

  userCredit: (id, amount, reason) => {
    const input = parse(adminCreditSchema, { amount, reason });
    return import('./api').then(({ users }) => users.credit(id, input.amount));
  },

  escrow: {
    disputes: (status) => escrow.disputes(status),
    resolve: (disputeId, ruling, rulingNotes, payerPct, payeePct) =>
      escrow.resolve(disputeId, ruling, rulingNotes, payerPct, payeePct),
    assign: (disputeId, assignedToId) => escrow.assign(disputeId, assignedToId),
  },
};
