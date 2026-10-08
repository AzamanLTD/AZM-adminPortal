/**
 * Pure model for the NEEDS_MANUAL_REVIEW operator surface.
 *
 * Backend contract (AZM-backend main, PR #325):
 *   POST /api/admin/withdrawals/:id/resolve-review
 *   Body: { action: RESUME | REJECT | ESCALATE, reason: 3–500 chars }
 *   - RESUME is only accepted when the backend PROVES the payout was never
 *     dispatched.
 *   - REJECT is only accepted when the backend PROVES pre-dispatch safety;
 *     the refund runs through the canonical reversal authority.
 *   - ESCALATE is always available and hands the case to the reconciliation
 *     authority.
 *   - Concurrent resolution loses safely with 409.
 *
 * The backend is authoritative. NOTHING in this module infers whether a
 * resolution is safe: eligibility for RESUME/REJECT is proven by the backend
 * at resolve time (409 with blockers when it cannot prove safety). This
 * module only normalizes evidence for display, mirrors the documented
 * reason-length wire rule, and classifies transport errors honestly.
 */

/** The three resolution actions, with honest operator copy. RESUME/REJECT
 * are rendered for every parked row because the portal cannot know whether
 * the backend can prove safety — the backend refuses fail-closed (409). */
export const RESOLUTION_ACTIONS = [
  {
    action: 'RESUME',
    label: 'Resume',
    description:
      'Re-enters the payout pipeline. The backend only allows this when it can PROVE the payout was never dispatched — otherwise it refuses.',
  },
  {
    action: 'REJECT',
    label: 'Reject & refund',
    description:
      'A real financial reversal: funds are refunded through the backend canonical reversal authority. Only allowed with backend-proven pre-dispatch safety.',
  },
  {
    action: 'ESCALATE',
    label: 'Escalate',
    description:
      'Always available. Hands the case durably to the reconciliation authority, which resolves it from provider truth. No money moves here.',
  },
];

/**
 * Mirror of the backend's documented reason rule (3–500 chars after trim).
 * This is input hygiene on a documented wire contract, not a safety
 * predicate — the backend re-validates authoritatively.
 * @param {unknown} reason
 * @returns {{ ok: boolean, message?: string, value?: string }}
 */
export function validateResolutionReason(reason) {
  if (typeof reason !== 'string') {
    return { ok: false, message: 'A resolution reason is required.' };
  }
  const value = reason.trim();
  if (value.length < 3 || value.length > 500) {
    return {
      ok: false,
      message: 'A resolution reason between 3 and 500 characters is required.',
    };
  }
  return { ok: true, value };
}

/**
 * Classify a resolve-review transport error honestly. 409 means either a
 * concurrent resolution (the row moved under us) or a backend refusal (it
 * cannot prove safety) — both carry the backend's authoritative message, and
 * the refusal additionally carries `data.blockers`.
 * @param {{ statusCode?: number, body?: { data?: { blockers?: unknown }, message?: string }, message?: string }} error
 * @returns {{ kind: 'REFUSED' | 'CONFLICT' | 'NOT_FOUND' | 'BAD_REQUEST' | 'OTHER', message: string, blockers: string[] }}
 */
export function classifyResolutionError(error) {
  const status = error?.statusCode;
  const body = error?.body;
  const message =
    (body && typeof body.message === 'string' && body.message) ||
    (typeof error?.message === 'string' && error.message) ||
    'Resolution failed.';
  if (status === 409) {
    const rawBlockers = body?.data?.blockers;
    const blockers = Array.isArray(rawBlockers)
      ? rawBlockers.filter((b) => typeof b === 'string')
      : [];
    return blockers.length > 0
      ? { kind: 'REFUSED', message, blockers }
      : { kind: 'CONFLICT', message, blockers: [] };
  }
  if (status === 404) return { kind: 'NOT_FOUND', message, blockers: [] };
  if (status === 400) return { kind: 'BAD_REQUEST', message, blockers: [] };
  return { kind: 'OTHER', message, blockers: [] };
}

/**
 * Normalize the durable parking evidence a parked withdrawal carries, for
 * display. Partial or malformed evidence parses but is NEVER presented as
 * proof of safety: `provablePhase` is only true when the backend actually
 * recorded a phase. The portal never derives eligibility from this —
 * RESUME/REJECT safety is proven by the backend at resolve time.
 * @param {{ manualReview?: { reasons?: unknown, resolutionOptions?: unknown } | null }} withdrawal
 * @returns {{ entries: Array<{ reason: string, phase: string | null, reference: string | null, firstSeenAt: string | null, lastSeenAt: string | null, provablePhase: boolean }>, options: string[], hasEvidence: boolean, partialEvidence: boolean }}
 */
export function parkingEvidenceModel(withdrawal) {
  const manualReview = withdrawal?.manualReview;
  const rawReasons = Array.isArray(manualReview?.reasons) ? manualReview.reasons : [];
  const entries = rawReasons
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const phase = typeof r.phase === 'string' && r.phase ? r.phase : null;
      return {
        reason: typeof r.reason === 'string' && r.reason ? r.reason : 'UNKNOWN',
        phase,
        reference: typeof r.reference === 'string' && r.reference ? r.reference : null,
        firstSeenAt: typeof r.firstSeenAt === 'string' && r.firstSeenAt ? r.firstSeenAt : null,
        lastSeenAt: typeof r.lastSeenAt === 'string' && r.lastSeenAt ? r.lastSeenAt : null,
        provablePhase: phase !== null,
      };
    });
  const options = Array.isArray(manualReview?.resolutionOptions)
    ? manualReview.resolutionOptions.filter((o) => typeof o === 'string')
    : [];
  return {
    entries,
    options,
    hasEvidence: entries.length > 0,
    // No recorded phase anywhere means the backend cannot prove anything —
    // never describe this row as safe to refund.
    partialEvidence:
      entries.length === 0 || entries.some((e) => !e.provablePhase),
  };
}

/**
 * The row whose action is currently in flight, for per-row button disabling
 * (prevents double-submit of the same row's resolution).
 * @param {{ isPending?: boolean, variables?: { id?: unknown } | null }} mutation
 * @returns {unknown | null}
 */
export function inFlightRowId(mutation) {
  if (!mutation?.isPending) return null;
  return mutation?.variables?.id ?? null;
}
