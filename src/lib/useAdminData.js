/**
 * React Query hooks for all admin data fetching.
 * Connected to the live backend API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';
import { financialApi } from './financialApi';

export function useStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const data = await api.admin.stats();
      return data.stats || data;
    },
    refetchInterval: 30000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const data = await api.admin.systemHealth();
      return data.data || data;
    },
    refetchInterval: 15000,
  });
}

/** @returns {import('@tanstack/react-query').UseQueryResult<import('./settingsTypes').AdminSettings, Error>} */
export function useGlobalSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const data = await financialApi.settings.get();
      return data.settings;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: /** @param {Record<string, unknown>} data */ (data) => financialApi.settings.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });
}

export function useFeeProfiles() {
  return useQuery({
    queryKey: ['admin', 'fee-profiles'],
    queryFn: async () => {
      const data = await api.feeProfiles.list();
      return data.profiles || [];
    },
  });
}

export function useCreateFeeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: /** @param {Record<string, unknown>} data */ (data) => api.feeProfiles.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fee-profiles'] }),
  });
}

export function useUpdateFeeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: /** @param {{ id: string | number, [key: string]: unknown }} data */ ({ id, ...data }) => api.feeProfiles.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fee-profiles'] }),
  });
}

export function useDeleteFeeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: /** @param {string | number} id */ (id) => api.feeProfiles.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fee-profiles'] }),
  });
}

export function useProfitBreakdown() {
  return useQuery({
    queryKey: ['admin', 'profit'],
    queryFn: async () => {
      const data = await api.admin.profitBreakdown();
      return data.data || data;
    },
  });
}

export function useUsers(page = 1, search = '') {
  return useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: async () => {
      const data = await api.users.list(page, search);
      return data.data || data;
    },
  });
}

export function useDisputes() {
  return useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => {
      const data = await financialApi.disputes.list();
      return data.disputes || [];
    },
    refetchInterval: 20000,
  });
}

export function useWithdrawals() {
  return useQuery({
    queryKey: ['admin', 'withdrawals'],
    queryFn: async () => {
      const response = await financialApi.withdrawals.pending();
      const { pending, frozen, counts, pagination } = response.data;
      return Object.assign(
        pending.map((withdrawal) => ({
          ...withdrawal,
          requestedAt: withdrawal.createdAt,
          method: withdrawal.payoutMethod,
          wallet: withdrawal.destination,
        })),
        { frozen, counts, pagination },
      );
    },
    refetchInterval: 30000,
  });
}

// Payouts flagged NEEDS_MANUAL_REVIEW (the autonomous payout worker couldn't
// auto-dispatch them). Used by the notification center.
export function useNeedsReviewWithdrawals() {
  return useQuery({
    queryKey: ['admin', 'withdrawals', 'needs-review'],
    queryFn: async () => {
      const data = await api.withdrawals.needsReview();
      // Shape tolerance: backend may return {data:{...}}, {withdrawals}, {needsReview}, or an array.
      return (
        data?.data?.needsReview ||
        data?.needsReview ||
        data?.withdrawals ||
        data?.data ||
        (Array.isArray(data) ? data : [])
      );
    },
    refetchInterval: 30000,
  });
}

// Pending vendor applications (mirrors the Users.jsx VendorPanel query).
export function useVendorApplications() {
  return useQuery({
    queryKey: ['vendor', 'apps'],
    queryFn: async () => {
      const data = await api.vendors.applications('PENDING');
      return data?.applications || data?.data || (Array.isArray(data) ? data : []);
    },
    refetchInterval: 60000,
  });
}

// Resolved dispute history (for the "Resolved" feed in the notification center).
export function useDisputeResolutions() {
  return useQuery({
    queryKey: ['admin', 'dispute-resolutions'],
    queryFn: async () => {
      const data = await api.trades.resolutions();
      return data?.resolutions || data?.data?.resolutions || (Array.isArray(data) ? data : []);
    },
    refetchInterval: 60000,
  });
}

// Pending KYC applications (shares the ['kyc','pending'] key used inline in Users.jsx).
export function usePendingKyc() {
  return useQuery({
    queryKey: ['kyc', 'pending'],
    queryFn: async () => {
      const data = await api.kyc.pending();
      return data?.applications || data?.data || (Array.isArray(data) ? data : []);
    },
    refetchInterval: 60000,
  });
}

export function useAuditLog(page = 1, filters = {}) {
  return useQuery({
    queryKey: ['admin', 'audit-log', page, filters],
    queryFn: async () => {
      const data = await api.auditLog.list(page, filters);
      return data;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE SUSU ECOSYSTEM — Admin Portal (Phase 5 / Workstream E)
// ─────────────────────────────────────────────────────────────────────────────

export function useSusuList(status) {
  return useQuery({
    queryKey: ['admin', 'susu', 'list', status || 'all'],
    queryFn: async () => {
      const data = await api.susuAdmin.list(status);
      return data.data?.susus || [];
    },
    refetchInterval: 30000,
  });
}

export function useSusuDetail(id) {
  return useQuery({
    queryKey: ['admin', 'susu', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const data = await api.susuAdmin.detail(id);
      return data.data || data;
    },
  });
}
