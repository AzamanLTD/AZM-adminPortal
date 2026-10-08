// src/lib/useAdminNotifications.js
// =============================================================================
// AZAMAN ADMIN — Notification Center aggregator (live-aggregation)
//
// There is no persisted admin-notification table in the backend. Instead, this
// hook DERIVES a unified notification feed from the real, already-persisted
// "needs attention" sources that each have their own admin endpoint:
//   pending withdrawals, needs-review payouts, active disputes, dispute
//   resolutions, Susu war-room alerts, pending KYC, vendor applications,
//   proof-of-residency queue, and low system pools.
//
// Because notifications are derived (not stored), read/unread state is kept
// per-admin in localStorage, keyed by a STABLE synthetic id per item (e.g.
// "withdrawal:123") so it survives refetches and refreshes.
//
// Every source query REUSES the existing query keys where the pages already
// fetch them, so the cache is shared (no duplicate network traffic) and the
// feed stays in lock-step with the pages.
// =============================================================================

import { useMemo, useCallback, useState } from 'react';
import {
  useWithdrawals,
  useNeedsReviewWithdrawals,
  useDisputes,
  useDisputeResolutions,
  useSusuIncidents,
  usePendingKyc,
  useVendorApplications,
  usePoRQueue,
  useSystemHealth,
} from './useAdminData';

const READ_KEY = 'admin_notifications_read';
const READ_CAP = 500; // prune the read-map so it can't grow without bound

// ── localStorage read-state helpers ─────────────────────────────────────────
function loadReadMap() {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReadMap(map) {
  try {
    // Keep only the most recent READ_CAP entries by ISO timestamp.
    const entries = Object.entries(map);
    if (entries.length > READ_CAP) {
      entries.sort((a, b) => (a[1] < b[1] ? 1 : -1));
      map = Object.fromEntries(entries.slice(0, READ_CAP));
    }
    localStorage.setItem(READ_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
const asArray = (v) => (Array.isArray(v) ? v : []);
const num = (v) => (v === null || v === undefined ? '' : v);

function pick(obj, keys, fallback = undefined) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

// Severity rank for sorting (higher = more urgent).
const SEV_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

// =============================================================================
// Source → normalized notification mappers. Each returns an array of:
//   { id, source, severity, title, description, createdAt, route, status, raw }
// =============================================================================

function mapWithdrawals(list) {
  return asArray(list).map((w) => ({
    id: `withdrawal:${w.id}`,
    source: 'WITHDRAWAL',
    severity: Number(w.amount) >= 500 ? 'HIGH' : 'MEDIUM',
    title: `Withdrawal pending — $${num(w.amount)} ${num(w.currency)}`.trim(),
    description: `${pick(w, ['userName'], 'User')} · ${pick(w, ['method', 'wallet'], '—')}`,
    createdAt: pick(w, ['requestedAt', 'createdAt']),
    route: '/withdrawals',
    status: 'open',
    raw: w,
  }));
}

function mapNeedsReview(list) {
  return asArray(list).map((w) => ({
    id: `payout-review:${w.id}`,
    source: 'WITHDRAWAL',
    severity: 'HIGH',
    title: `Payout needs manual review — $${num(w.amount)} ${num(w.currency)}`.trim(),
    description: `${pick(w, ['userName'], 'User')} · flagged by auto-payout`,
    createdAt: pick(w, ['requestedAt', 'createdAt', 'updatedAt']),
    route: '/withdrawals',
    status: 'open',
    raw: w,
  }));
}

function mapDisputes(list) {
  return asArray(list).map((d) => ({
    id: `dispute:${d.id}`,
    source: 'DISPUTE',
    severity: 'HIGH',
    title: `Trade dispute #${d.id} — $${num(d.amount)} ${num(d.currency)}`.trim(),
    description: `${pick(d.buyer, ['name'], 'buyer')} vs ${pick(d.vendor, ['name'], 'vendor')} · ${num(d.paymentMethod)}`,
    createdAt: pick(d, ['createdAt', 'disputedAt']),
    route: '/war-room',
    status: 'open',
    raw: d,
  }));
}

function mapDisputeResolutions(list) {
  return asArray(list).map((r) => ({
    id: `dispute-resolution:${pick(r, ['id', 'tradeId'])}`,
    source: 'DISPUTE',
    severity: 'LOW',
    title: `Dispute resolved — ${num(pick(r, ['ruling'], ''))}`.trim(),
    description: `Trade #${num(pick(r, ['tradeId', 'id']))}${r.reason ? ` · ${r.reason}` : ''}`,
    createdAt: pick(r, ['executedAt', 'createdAt']),
    route: '/war-room',
    status: 'resolved',
    raw: r,
  }));
}

const SUSU_LABEL = {
  ADMIN_DEFAULT: 'Admin default',
  MASS_DEFAULT_THRESHOLD: 'Mass default',
  ESCROW_DIVERSION: 'Escrow diversion',
  VOUCH_SLASH_TX_FAILURE: 'Vouch-slash TX failure',
};

function mapSusuAlerts(list) {
  return asArray(list).map((a) => {
    const resolved = !!a.resolution;
    const acknowledged = !!a.acknowledgedAt;
    return {
      id: `warroom:${a.id}`,
      source: 'SUSU',
      severity: resolved ? 'LOW' : 'CRITICAL',
      title: `Susu incident — ${SUSU_LABEL[a.alertType] || a.alertType}`,
      description:
        pick(a.payload, ['summary'], 'Susu incident') +
        (a.susuGroupId ? ` · group ${String(a.susuGroupId).slice(0, 8)}` : ''),
      createdAt: a.createdAt,
      route: '/susu-incidents',
      status: resolved ? 'resolved' : 'open',
      acknowledged,
      raw: a,
    };
  });
}

function mapKyc(list) {
  return asArray(list).map((k) => ({
    id: `kyc:${pick(k, ['id', 'userId'])}`,
    source: 'KYC',
    severity: 'MEDIUM',
    title: `KYC review — ${pick(k, ['userName', 'userId'], 'user')}`,
    description: `${num(k.email)} · awaiting verification`,
    createdAt: pick(k, ['submittedAt', 'createdAt']),
    route: '/users?tab=kyc',
    status: 'open',
    raw: k,
  }));
}

function mapVendors(list) {
  return asArray(list).map((a) => ({
    id: `vendor:${a.id}`,
    source: 'VENDOR',
    severity: 'MEDIUM',
    title: `Vendor application — ${pick(a, ['userName', 'legalName'], 'applicant')}`,
    description: `${num(a.email)} · awaiting review`,
    createdAt: pick(a, ['createdAt']),
    route: '/users?tab=vendors',
    status: 'open',
    raw: a,
  }));
}

function mapResidency(list) {
  return asArray(list).map((s) => ({
    id: `por:${s.id}`,
    source: 'RESIDENCY',
    severity: 'MEDIUM',
    title: `Proof of residency — @${num(s.username)}`,
    description: `${num(s.email)} · document awaiting review`,
    createdAt: pick(s, ['proofOfResidencySubmittedAt', 'createdAt']),
    route: '/residency-queue',
    status: 'open',
    raw: s,
  }));
}

// System pools running low → one notification per warning pool.
function mapPools(health) {
  const pools = health?.pools || {};
  const out = [];
  for (const [key, pool] of Object.entries(pools)) {
    const status = String(pool?.status || '').toUpperCase();
    if (status === 'WARNING' || status === 'LOW' || status === 'CRITICAL') {
      out.push({
        id: `pool-low:${key}`,
        source: 'SYSTEM',
        severity: status === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `Pool low — ${key}`,
        description: `Balance ${num(pool?.balance)} · status ${status}`,
        createdAt: pick(health, ['timestamp']) || new Date().toISOString(),
        route: '/pools',
        status: 'open',
        raw: pool,
      });
    }
  }
  return out;
}

// =============================================================================
// The hook
// =============================================================================
export function useAdminNotifications() {
  const withdrawals = useWithdrawals();
  const needsReview = useNeedsReviewWithdrawals();
  const disputes = useDisputes();
  const disputeResolutions = useDisputeResolutions();
  const susuOpen = useSusuIncidents(false);
  const susuResolved = useSusuIncidents(true);
  const kyc = usePendingKyc();
  const vendors = useVendorApplications();
  const residency = usePoRQueue();
  const health = useSystemHealth();

  // Read-map lives in component state so toggling it re-renders the badge.
  const [readMap, setReadMap] = useState(loadReadMap);

  const markRead = useCallback((ids) => {
    setReadMap((prev) => {
      const next = { ...prev };
      const now = new Date().toISOString();
      for (const id of Array.isArray(ids) ? ids : [ids]) next[id] = now;
      saveReadMap(next);
      return next;
    });
  }, []);

  const all = useMemo(() => {
    const merged = [
      ...mapWithdrawals(withdrawals.data),
      ...mapNeedsReview(needsReview.data?.rows),
      ...mapDisputes(disputes.data),
      ...mapDisputeResolutions(disputeResolutions.data),
      ...mapSusuAlerts(susuOpen.data),
      ...mapSusuAlerts(susuResolved.data),
      ...mapKyc(kyc.data),
      ...mapVendors(vendors.data),
      ...mapResidency(residency.data),
      ...mapPools(health.data),
    ];

    // De-dupe by id (susu open+resolved can overlap on 'all'-style fetches).
    const byId = new Map();
    for (const n of merged) if (!byId.has(n.id)) byId.set(n.id, n);

    // Decorate with read-state, then sort: unread-open first, then severity,
    // then most recent.
    const decorated = [...byId.values()].map((n) => ({
      ...n,
      read: !!readMap[n.id],
    }));

    decorated.sort((a, b) => {
      // resolved sinks below open
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      const sev = (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0);
      if (sev !== 0) return sev;
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });

    return decorated;
  }, [
    withdrawals.data, needsReview.data, disputes.data, disputeResolutions.data,
    susuOpen.data, susuResolved.data, kyc.data, vendors.data, residency.data,
    health.data, readMap,
  ]);

  const open = useMemo(() => all.filter((n) => n.status === 'open'), [all]);
  const resolved = useMemo(() => all.filter((n) => n.status === 'resolved'), [all]);

  // Unread count is for OPEN items only — resolved items are not "work".
  const unreadCount = useMemo(
    () => open.filter((n) => !n.read).length,
    [open],
  );

  const markAllRead = useCallback(() => {
    markRead(all.map((n) => n.id));
  }, [all, markRead]);

  const isLoading =
    withdrawals.isLoading || disputes.isLoading || susuOpen.isLoading ||
    kyc.isLoading || residency.isLoading;

  return { open, resolved, all, unreadCount, markRead, markAllRead, isLoading };
}
