import { describe, expect, it } from 'vitest';

import {
  RESOLUTION_ACTIONS,
  classifyResolutionError,
  inFlightRowId,
  parkingEvidenceModel,
  validateResolutionReason,
} from './manualReviewQueue';

// ── Operator actions ────────────────────────────────────────────────────────
describe('RESOLUTION_ACTIONS', () => {
  it('exposes exactly the three backend actions with honest authority copy', () => {
    expect(RESOLUTION_ACTIONS.map((a) => a.action)).toEqual(['RESUME', 'REJECT', 'ESCALATE']);
    // RESUME copy must say the backend proves safety — the portal never does.
    expect(RESOLUTION_ACTIONS[0].description).toMatch(/backend/i);
    expect(RESOLUTION_ACTIONS[0].description).toMatch(/prove|PROVE/);
    // REJECT copy must say it is a real financial reversal.
    expect(RESOLUTION_ACTIONS[1].description).toMatch(/reversal/i);
    // ESCALATE must hand off to reconciliation authority.
    expect(RESOLUTION_ACTIONS[2].description).toMatch(/reconciliation authority/i);
  });
});

// ── Required human reason ────────────────────────────────────────────────────
describe('validateResolutionReason', () => {
  it('accepts a 3–500 char reason and trims surrounding whitespace', () => {
    expect(validateResolutionReason('  ok review  ')).toEqual({ ok: true, value: 'ok review' });
    expect(validateResolutionReason('x'.repeat(500)).ok).toBe(true);
  });

  it('rejects empty, too-short and too-long reasons with the backend wire rule', () => {
    expect(validateResolutionReason('').ok).toBe(false);
    expect(validateResolutionReason('no').ok).toBe(false);
    expect(validateResolutionReason('x'.repeat(501)).ok).toBe(false);
    expect(validateResolutionReason(null).ok).toBe(false);
    expect(validateResolutionReason(undefined).ok).toBe(false);
    expect(validateResolutionReason(42).ok).toBe(false);
  });
});

// ── Honest 409 / conflict handling ───────────────────────────────────────────
describe('classifyResolutionError', () => {
  it('classifies a 409 eligibility refusal with authoritative blockers', () => {
    const error = {
      statusCode: 409,
      body: {
        success: false,
        message: 'Resolution is refused: the backend cannot prove the provider never dispatched this payout. Escalate to the reconciliation authority instead.',
        data: { withdrawalId: 31, blockers: ['Durable anomaly POST_DISPATCH_BOOKKEEPING_FAILED means the provider may have been paid.'] },
      },
    };
    const classified = classifyResolutionError(error);
    expect(classified.kind).toBe('REFUSED');
    expect(classified.blockers).toEqual(['Durable anomaly POST_DISPATCH_BOOKKEEPING_FAILED means the provider may have been paid.']);
  });

  it('classifies a plain concurrent-resolution 409 without blockers as CONFLICT', () => {
    const error = {
      statusCode: 409,
      body: { success: false, message: 'Withdrawal was resolved concurrently — refresh to see its final state.' },
    };
    const classified = classifyResolutionError(error);
    expect(classified.kind).toBe('CONFLICT');
    expect(classified.blockers).toEqual([]);
    expect(classified.message).toContain('concurrently');
  });

  it('classifies 400, 404 and untyped transport errors honestly', () => {
    expect(classifyResolutionError({ statusCode: 400, body: { message: 'action must be RESUME, REJECT or ESCALATE.' } }).kind).toBe('BAD_REQUEST');
    expect(classifyResolutionError({ statusCode: 404, body: { message: 'Withdrawal not found.' } }).kind).toBe('NOT_FOUND');
    expect(classifyResolutionError({ statusCode: 500, body: { message: 'boom' } }).kind).toBe('OTHER');
    expect(classifyResolutionError({ message: 'Network request failed' }).kind).toBe('OTHER');
    // Malformed blockers arrays must not leak non-strings into the UI.
    expect(
      classifyResolutionError({ statusCode: 409, body: { message: 'refused', data: { blockers: 'nope' } } }).blockers,
    ).toEqual([]);
  });
});

// ── Durable parking evidence display model ───────────────────────────────────
describe('parkingEvidenceModel', () => {
  it('normalizes full backend evidence (reason, phase, reference, timestamps)', () => {
    const model = parkingEvidenceModel({
      manualReview: {
        reasons: [{
          reason: 'AMOUNT_EXCEEDS_THRESHOLD',
          phase: 'PRE_DISPATCH',
          reference: 'TX-9001',
          firstSeenAt: '2026-10-08T09:00:01.000Z',
          lastSeenAt: '2026-10-08T09:04:00.000Z',
        }],
        resolutionOptions: ['ESCALATE'],
      },
    });
    expect(model.hasEvidence).toBe(true);
    expect(model.partialEvidence).toBe(false);
    expect(model.entries[0].provablePhase).toBe(true);
    expect(model.options).toEqual(['ESCALATE']);
  });

  it('treats a reason WITHOUT a phase as partial evidence, never provable', () => {
    const model = parkingEvidenceModel({
      manualReview: { reasons: [{ reason: 'DISPATCH_IDENTITY_UNKNOWN' }], resolutionOptions: ['ESCALATE'] },
    });
    expect(model.partialEvidence).toBe(true);
    expect(model.entries[0].provablePhase).toBe(false);
    expect(model.entries[0].phase).toBeNull();
  });

  it('treats missing or malformed manualReview as NO evidence — never safe-to-refund', () => {
    expect(parkingEvidenceModel({}).hasEvidence).toBe(false);
    expect(parkingEvidenceModel({ manualReview: null }).partialEvidence).toBe(true);
    expect(parkingEvidenceModel({ manualReview: { reasons: 'garbage' } }).entries).toEqual([]);
    expect(parkingEvidenceModel(null).hasEvidence).toBe(false);
  });
});

// ── Concurrency: per-row in-flight disabling ─────────────────────────────────
describe('inFlightRowId', () => {
  it('returns the row id while that row action is in flight, null otherwise', () => {
    expect(inFlightRowId({ isPending: true, variables: { id: 31, action: 'RESUME', reason: 'ok' } })).toBe(31);
    expect(inFlightRowId({ isPending: false, variables: { id: 31 } })).toBeNull();
    expect(inFlightRowId({ isPending: true, variables: null })).toBeNull();
    expect(inFlightRowId(undefined)).toBeNull();
  });
});
