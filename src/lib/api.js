import { connectAdminSocket, updateAdminSocketToken, disconnectAdminSocket } from './adminSocket';

/**
 * Central API layer for the Admin Dashboard.
 *
 * Access JWTs live only in memory. The refresh credential is kept by the
 * backend in the `azm_admin_refresh` HttpOnly cookie and is never exposed to
 * JavaScript storage. Every authenticated request and the Admin Socket.IO
 * handshake therefore use the same current access-token generation.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://azm-backend.onrender.com';
const REQUEST_TIMEOUT_MS = 30_000;
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
  if (accessToken) updateAdminSocketToken(accessToken);
}

export function getAccessToken() { return accessToken; }

export function clearAccessToken() {
  accessToken = null;
  disconnectAdminSocket();
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetchWithTimeout('/api/auth/admin-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.accessToken) throw new Error(data.message || 'Session refresh failed');
        setAccessToken(data.accessToken);
        return data;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function restoreAdminSession() {
  return refreshSession();
}

export async function logoutAdminSession() {
  try {
    await fetchWithTimeout('/api/auth/admin-session/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } finally {
    clearAccessToken();
  }
}

async function request(path, options = {}) {
  const isLoginCall = path === '/api/auth/admin-session/login';
  const isSessionCall = path.startsWith('/api/auth/admin-session');

  async function send(token) {
    // Caller headers remain available for non-security concerns. Authentication
    // is computed last so stale caller input can never replace the live session.
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else headers.delete('Authorization');

    return fetchWithTimeout(path, {
      ...options,
      credentials: 'include',
      headers,
    });
  }

  let res = await send(accessToken);

  if (res.status === 401 && !isLoginCall && !isSessionCall) {
    try {
      await refreshSession();
      res = await send(accessToken);
    } catch (_) {
      clearAccessToken();
    }
  }

  const data = await res.json().catch(() => ({ message: res.statusText }));
  if (!res.ok) {
    if (res.status === 401 && !isLoginCall && !isSessionCall) {
      clearAccessToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
      throw new Error('Session expired. Please log in again.');
    }
    const error = new Error(data.message || data.error || 'Request failed');
    error.statusCode = res.status;
    if (res.status === 402) {
      error.violations = data.violations;
      error.tier = data.tier;
      error.stakedBalance = data.stakedBalance;
    }
    throw error;
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: async (email, password) => {
    const data = await request('/api/auth/admin-session/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      connectAdminSocket(data.accessToken);
    }
    return data;
  },
  restore: refreshSession,
  logout: logoutAdminSession,
};

// ── Admin Stats & Health ──────────────────────────────────────────────────────
export const admin = {
  stats: () => request('/api/admin/stats'),
  systemHealth: () => request('/api/admin/system-health'),
  profitBreakdown: () => request('/api/admin/profit-breakdown'),
};

// ── Global Settings (Financial Parameters) ───────────────────────────────────
export const settings = {
  get: () => request('/api/admin/settings'),
  update: (data) => request('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Fee Profiles ──────────────────────────────────────────────────────────────
export const feeProfiles = {
  list: () => request('/api/admin/fee-profiles'),
  create: (data) => request('/api/admin/fee-profiles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/admin/fee-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/admin/fee-profiles/${id}`, { method: 'DELETE' }),
  resolve: (context) => request(`/api/admin/fee-profiles/resolve?${new URLSearchParams(context)}`),
};

// ── Trades ────────────────────────────────────────────────────────────────────
export const trades = {
  live: (page = 1) => request(`/api/admin/trades/live?page=${page}`),
  disputes: (page = 1) => request(`/api/admin/disputes?page=${page}`),
  forceRelease: (tradeId, reason) => request('/api/admin/disputes/force-release', { method: 'POST', body: JSON.stringify({ tradeId, reason }) }),
  forceCancel: (tradeId, reason) => request('/api/admin/disputes/force-cancel', { method: 'POST', body: JSON.stringify({ tradeId, reason }) }),
  resolve: (tradeId, ruling, reason, buyerPercent, override) => request(`/api/admin/disputes/${tradeId}/resolve`, { method: 'POST', body: JSON.stringify({ ruling, reason, buyerPercent, ...(override ? { override: true } : {}) }) }),
  resolutions: () => request('/api/admin/disputes/resolutions'),
  injectMessage: (tradeId, message) => request('/api/admin/chat/inject', { method: 'POST', body: JSON.stringify({ tradeId, message }) }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = {
  list: (page = 1, search = '') => request(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`),
  ban: (id, duration) => request(`/api/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ duration }) }),
  changeRole: (id, role) => request(`/api/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  setRiskTier: (id, tier) => request(`/api/admin/users/${id}/risk-tier`, { method: 'POST', body: JSON.stringify({ tier }) }),
  detail: (id) => request(`/api/admin/users/${id}/detail`),
  credit: (id, amount) => request(`/api/admin/users/${id}/credit`, { method: 'POST', body: JSON.stringify({ amount, reason: 'Admin credit via portal' }) }),
};

// ── KYC ───────────────────────────────────────────────────────────────────────
export const kyc = {
  pending: () => request('/api/admin/kyc/pending'),
  approve: (id) => request('/api/admin/kyc/approve', { method: 'POST', body: JSON.stringify({ id }) }),
  reject: (id, reason) => request('/api/admin/kyc/reject', { method: 'POST', body: JSON.stringify({ id, reason }) }),
};

// ── Withdrawals ───────────────────────────────────────────────────────────────
export const withdrawals = {
  pending: () => request('/api/admin/withdrawals/pending'),
  approve: (id) => request(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' }),
  reject: (id, reason) => request(`/api/admin/withdrawals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  needsReview: () => request('/api/admin/payouts/needs-review'),
};

// ── Payout Settings ───────────────────────────────────────────────────────────
export const payouts = {
  getSettings: () => request('/api/admin/payouts/settings'),
  updateSettings: (data) => request('/api/admin/payouts/settings', { method: 'PUT', body: JSON.stringify(data) }),
  batchProcess: () => request('/api/admin/payouts/batch-process', { method: 'POST' }),
};

// ── Vendors ───────────────────────────────────────────────────────────────────
export const vendors = {
  applications: (status = 'PENDING') => request(`/api/vendor/applications?status=${status}`),
  review: (id, action, reason) => request(`/api/vendor/applications/${id}/review`, { method: 'POST', body: JSON.stringify({ action, reason }) }),
};

// ── Trade Accounts ────────────────────────────────────────────────────────────
export const tradeAccounts = {
  pending: () => request('/api/admin/trade-accounts/pending'),
  approve: (id) => request(`/api/admin/trade-accounts/${id}/approve`, { method: 'POST' }),
  reject: (id, reason) => request(`/api/admin/trade-accounts/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

// ── War Room ──────────────────────────────────────────────────────────────────
export const warRoom = {
  corporatePurchase: (data) => request('/api/war-room/corporate-purchase', { method: 'POST', body: JSON.stringify(data) }),
  liquidateProfits: (data) => request('/api/war-room/liquidate-profits', { method: 'POST', body: JSON.stringify(data) }),
  coldStorage: (data) => request('/api/war-room/cold-storage', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Susu Incidents ────────────────────────────────────────────────────────────
export const susuIncidents = {
  alerts: (acknowledged) => {
    const qs = acknowledged === undefined ? '' : `?acknowledged=${acknowledged}`;
    return request(`/api/admin/war-room/alerts${qs}`);
  },
  acknowledge: (id) => request(`/api/admin/war-room/alerts/${id}/acknowledge`, { method: 'POST' }),
};

// ── Private Susu Ecosystem ────────────────────────────────────────────────────
export const susuAdmin = {
  list: (status) => request(`/api/admin/susu${status ? `?status=${status}` : ''}`),
  detail: (id) => request(`/api/admin/susu/${id}`),
  member: (userId) => request(`/api/admin/susu/members/${userId}`),
  resolve: (id, action, notes, alertId) => request(`/api/admin/susu/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action, notes, alertId }) }),
};

export const proofOfResidency = {
  queue: () => request('/api/admin/proof-of-residency/queue'),
  approve: (userId) => request(`/api/admin/proof-of-residency/${userId}/review`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) }),
  reject: (userId, reason) => request(`/api/admin/proof-of-residency/${userId}/review`, { method: 'POST', body: JSON.stringify({ decision: 'reject', reason }) }),
};

export const versionGate = {
  get: () => request('/api/admin/version-gate'),
  update: (data) => request('/api/admin/version-gate', { method: 'PUT', body: JSON.stringify(data) }),
};

export const auditLog = {
  list: (page = 1, filters = {}) => request(`/api/admin/audit-log?page=${page}&${new URLSearchParams(filters)}`),
};

export const businessKyb = {
  queue: (status = 'PENDING') => request(`/api/admin/business-kyb?status=${status}`),
  reviewDoc: (documentId, status, reviewNotes) => request(`/api/admin/business-kyb/${documentId}/review`, { method: 'POST', body: JSON.stringify({ status, reviewNotes }) }),
  approve: (bizId) => request(`/api/admin/business-kyb/${bizId}/approve`, { method: 'POST' }),
  reject: (bizId, reason) => request(`/api/admin/business-kyb/${bizId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

export const escrow = {
  disputes: (status) => request(`/api/admin/escrow-disputes${status ? `?status=${status}` : ''}`),
  resolve: (disputeId, ruling, rulingNotes, payerPct, payeePct) => request(`/api/admin/escrow-disputes/${disputeId}/resolve`, { method: 'POST', body: JSON.stringify({ ruling, rulingNotes, payerPct, payeePct }) }),
  assign: (disputeId, assignedToId) => request(`/api/admin/escrow-disputes/${disputeId}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId }) }),
};

export const businesses = {
  list: (page = 1, search = '', kybStatus = '', category = '') => request(`/api/admin/businesses?page=${page}&q=${encodeURIComponent(search)}${kybStatus ? `&kybStatus=${kybStatus}` : ''}${category ? `&category=${category}` : ''}`),
  detail: (bizId) => request(`/api/business/${bizId}`).catch(() => request(`/api/admin/businesses/${bizId}/detail`)),
  orders: (bizId, params = {}) => { const qs = new URLSearchParams({ bizId, ...params }).toString(); return request(`/api/admin/businesses/${bizId}/orders?${qs}`); },
  employees: (bizId) => request(`/api/admin/businesses/${bizId}/employees`),
  hotelRooms: (bizId) => request(`/api/admin/businesses/${bizId}/hotel/rooms`),
  housekeeping: (bizId) => request(`/api/admin/businesses/${bizId}/hotel/housekeeping`),
  kitchenOrders: (bizId) => request(`/api/admin/businesses/${bizId}/restaurant/kitchen`),
  tables: (bizId) => request(`/api/admin/businesses/${bizId}/restaurant/tables`),
  fleet: (bizId) => request(`/api/admin/businesses/${bizId}/transit/fleet`),
  drivers: (bizId) => request(`/api/admin/businesses/${bizId}/transit/drivers`),
  trips: (bizId) => request(`/api/admin/businesses/${bizId}/transit/trips`),
  finance: (bizId) => request(`/api/admin/businesses/${bizId}/finance`),
  suspend: (bizId, reason) => request(`/api/admin/businesses/${bizId}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unsuspend: (bizId) => request(`/api/admin/businesses/${bizId}/unsuspend`, { method: 'POST' }),
  resetKyb: (bizId) => request(`/api/admin/businesses/${bizId}/kyb-reset`, { method: 'POST' }),
};

export const aiOps = {
  cfoInsights: () => request('/api/admin/ai/cfo-insights'),
  discountCandidates: () => request('/api/admin/ai/discount-candidates'),
  approveDiscount: (userId, amount, duration) => request('/api/admin/ai/approve-discount', { method: 'POST', body: JSON.stringify({ userId, amount, duration }) }),
};

export const twoFactor = {
  status: () => request('/api/security/2fa/status'),
  setup: () => request('/api/security/2fa/setup', { method: 'POST' }),
  verify: (token) => request('/api/security/2fa/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  disable: (token) => request('/api/security/2fa/disable', { method: 'POST', body: JSON.stringify({ token }) }),
};

export const paymentHealth = { get: () => request('/api/admin/payment-providers/health') };

export const storefronts = {
  list: (page = 1, limit = 20) => request(`/api/admin/storefront?page=${page}&limit=${limit}`),
  disable: (businessProfileId) => request(`/api/admin/storefront/${businessProfileId}/disable`, { method: 'PATCH' }),
  enable: (businessProfileId) => request(`/api/admin/storefront/${businessProfileId}/enable`, { method: 'PATCH' }),
  revert: (businessProfileId, versionId) => request(`/api/admin/storefront/${businessProfileId}/revert/${versionId}`, { method: 'POST' }),
  getMedia: (businessProfileId) => request(`/api/admin/storefront/${businessProfileId}/media`),
};

export default {
  auth, admin, settings, feeProfiles, trades, users, kyc, withdrawals,
  payouts, vendors, tradeAccounts, warRoom, susuIncidents, susuAdmin,
  proofOfResidency, versionGate, auditLog, aiOps, twoFactor,
  businessKyb, escrow, businesses, paymentHealth, storefronts,
};
