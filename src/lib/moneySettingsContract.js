import { z } from 'zod';

/**
 * Money settings — directive 1-E contract, with the bound corrections from the
 * follow-up review.
 *
 * Canonical setting keys are the Money Contract Part 4 §8 names. The work packet
 * Part 5 §1-E spells the two payment-topup directions differently; rather than
 * invent a nested scheme, this file owns one explicit mapping
 * (LEGACY_KEY_ALIASES) and records the discrepancy for the owner.
 */

// ── Keys ─────────────────────────────────────────────────────────────────────
export const MONEY_SETTING_KEYS = [
    'quoteTtl.payment_topup',
    'quoteTtl.bucket_convert',
    'fxSpread.CONVERT_GHS_TO_USDC',
    'fxSpread.CONVERT_USDC_TO_GHS',
    'fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC',
    'fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS',
    'stepUpThresholdGhs',
    'balanceHeadlineMode',
];

/**
 * Part 5 §1-E names for the payment-topup directions, mapped onto the Part 4 §8
 * canonical keys. Recorded, not silently dropped: the owner must confirm which
 * spelling the backend will expose before the live gateway is connected.
 */
export const LEGACY_KEY_ALIASES = {
    'fxSpread.payment_topup.GHS_USDC': 'fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC',
    'fxSpread.payment_topup.USDC_GHS': 'fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS',
};

export const MONEY_SETTINGS_WRITE_PERMISSION = 'money.settings.write';

// ── Bounds ───────────────────────────────────────────────────────────────────
/**
 * Whole seconds, inclusive. Defaults are the documented ones: a top-up quote
 * lives 45s, a bucket-convert quote 60s.
 */
export const QUOTE_TTL = { min: 10, max: 900, unit: 'seconds' };
export const QUOTE_TTL_DEFAULTS = { 'quoteTtl.payment_topup': 45, 'quoteTtl.bucket_convert': 60 };

/** Spreads are held as integer basis points; 0–10% inclusive is 0–1000 bps. */
export const FX_SPREAD = { min: 0, max: 1000, unit: 'basis points' };

/** GHS threshold: 0.00 is meaningful (always step up), so the floor is zero. */
export const STEP_UP_THRESHOLD = { min: '0.00', max: null, unit: 'GHS' };

export const MONEY_SETTING_BOUNDS = {
    'quoteTtl.payment_topup': { kind: 'int', ...QUOTE_TTL },
    'quoteTtl.bucket_convert': { kind: 'int', ...QUOTE_TTL },
    'fxSpread.CONVERT_GHS_TO_USDC': { kind: 'bps', ...FX_SPREAD },
    'fxSpread.CONVERT_USDC_TO_GHS': { kind: 'bps', ...FX_SPREAD },
    'fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC': { kind: 'bps', ...FX_SPREAD },
    'fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS': { kind: 'bps', ...FX_SPREAD },
    stepUpThresholdGhs: { kind: 'ghs', ...STEP_UP_THRESHOLD },
};

export const HEADLINE_MODES = ['COMBINED_ESTIMATE', 'NATIVE_ONLY'];
export const OWNER_RESOLVED_KEY = 'balanceHeadlineMode';

export const MONEY_SETTING_META = {
    'quoteTtl.payment_topup': {
        group: 'Quote lifetime',
        label: 'Payment top-up quote TTL',
        description: 'How long a top-up quote stays payable, in whole seconds.',
    },
    'quoteTtl.bucket_convert': {
        group: 'Quote lifetime',
        label: 'Bucket convert quote TTL',
        description: 'How long a bucket-conversion quote stays valid, in whole seconds.',
    },
    'fxSpread.CONVERT_GHS_TO_USDC': {
        group: 'FX spread',
        label: 'Convert GHS → USDC',
        description: 'Spread applied when GHS is converted into a USDC bucket.',
    },
    'fxSpread.CONVERT_USDC_TO_GHS': {
        group: 'FX spread',
        label: 'Convert USDC → GHS',
        description: 'Spread applied when a USDC bucket is converted into GHS.',
    },
    'fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC': {
        group: 'FX spread',
        label: 'Payment top-up — GHS from USDC',
        description: 'USDC is converted to cover a GHS shortfall at payment time.',
    },
    'fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS': {
        group: 'FX spread',
        label: 'Payment top-up — USDC from GHS',
        description: 'GHS is converted to cover a USDC shortfall at payment time.',
    },
    stepUpThresholdGhs: {
        group: 'Step-up',
        label: 'Step-up threshold (GHS)',
        description: 'Direct GHS payments at or above this amount require step-up. 0.00 means always.',
    },
    'balanceHeadlineMode': {
        group: 'Headline',
        label: 'Balance headline mode',
        description: 'Owner decision D1 resolved: COMBINED_ESTIMATE is selected; NATIVE_ONLY remains a supported alternative. GHS stays the canonical displayed balance in both modes, and the USDC figure is an indicative equivalent, never spendable GHS.',
        pendingOwnerDecision: true,
    },
};

/**
 * Read-only rollout flags. There is deliberately no writer for these anywhere in
 * the portal: they are displayed with an explanation and nothing else.
 */
export const READ_ONLY_FLAGS = [
    {
        key: 'nativeGhsSettlementEnabled',
        label: 'Native GHS settlement',
        explanation: 'Settles GHS legs from the native GHS book instead of crossing through USDC.',
    },
    {
        key: 'nativeGhsWithdrawalEnabled',
        label: 'Native GHS withdrawal',
        explanation: 'Allows withdrawal paid from native GHS. Off until the authority regime is activated.',
    },
    {
        key: 'fiatLiquidityAuthorityEnabled',
        label: 'Fiat liquidity authority',
        explanation: 'Makes fiat liquidity authoritative for settlement decisions. One-way latch once on.',
    },
    {
        key: 'modelBSettlementEnabled',
        label: 'Model B settlement',
        explanation: 'Routes settlement through the provider-side GHS model. Off by default.',
    },
];

// ── Response shapes ──────────────────────────────────────────────────────────
const moneySettingEntry = z.object({
    key: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    effectiveFrom: z.string().nullable(),
    source: z.string().nullable(),
});

export const moneySettingsResponseSchema = z.object({
    settings: z.array(moneySettingEntry),
    flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number(), z.null()])),
    bounds: z.record(z.string(), z.object({
        min: z.union([z.number(), z.string()]).nullable(),
        max: z.union([z.number(), z.string()]).nullable(),
        unit: z.string().nullable(),
    })).optional(),
});

// ── Validation ───────────────────────────────────────────────────────────────
const GHS_AMOUNT = /^(0|[1-9]\d{0,11})(\.\d{1,2})?$/;

function isPlainInteger(text) {
    return typeof text === 'string' && /^\d+$/.test(text);
}

/** Exact comparison of two GHS decimal strings by pesewas. No floats anywhere. */
export function compareGhs(a, b) {
    const toPesewas = (v) => {
        const [whole, frac = ''] = String(v).split('.');
        return BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
    };
    const pa = toPesewas(a);
    const pb = toPesewas(b);
    if (pa === pb) return 0;
    return pa > pb ? 1 : -1;
}

export function canonicalKey(key) {
    return LEGACY_KEY_ALIASES[key] || key;
}

export function spreadPercent(bps) {
    const n = Number(bps);
    if (!Number.isInteger(n) || n < 0) return null;
    return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}%`;
}

/**
 * One shape always: ok/value/error together, so type narrowing never breaks.
 * @returns {{ok: boolean, value: (string|number|null), error: (string|null)}}
 */
export function validateSettingValue(rawKey, rawValue) {
    const key = canonicalKey(rawKey);
    const bound = MONEY_SETTING_BOUNDS[key];
    if (!bound) {
        return { ok: false, value: null, error: 'This key is not an editable money setting.' };
    }
    const text = typeof rawValue === 'number' ? String(rawValue) : String(rawValue ?? '').trim();

    if (bound.kind === 'ghs') {
        if (text === '') return { ok: false, value: null, error: 'Enter an amount.' };
        if (/[eE]/.test(text)) return { ok: false, value: null, error: 'Exponent notation is not allowed.' };
        if (text.startsWith('-')) return { ok: false, value: null, error: 'Negative amounts are not allowed.' };
        if (!GHS_AMOUNT.test(text)) {
            return { ok: false, value: null, error: 'Use a plain amount with at most two decimal places.' };
        }
        const normalised = text.includes('.') ? text : `${text}.00`;
        if (compareGhs(normalised, bound.min) < 0) {
            return { ok: false, value: null, error: `Minimum is ${bound.min} ${bound.unit}.` };
        }
        return { ok: true, value: normalised, error: null };
    }

    if (text !== '' && !isPlainInteger(text)) {
        return {
            ok: false,
            value: null,
            error: bound.kind === 'bps' ? 'Whole basis points only.' : 'Whole numbers only.',
        };
    }
    const numeric = Number(text);
    if (!Number.isInteger(numeric)) {
        return { ok: false, value: null, error: 'Whole numbers only.' };
    }
    if (numeric < bound.min) {
        const human = bound.kind === 'bps' ? `${spreadPercent(bound.min)} (${bound.min} bps)` : `${bound.min} ${bound.unit}`;
        return { ok: false, value: null, error: `Minimum is ${human}.` };
    }
    if (bound.max !== null && numeric > bound.max) {
        const human = bound.kind === 'bps' ? `${spreadPercent(bound.max)} (${bound.max} bps)` : `${bound.max} ${bound.unit}`;
        return { ok: false, value: null, error: `Maximum is ${human}.` };
    }
    return { ok: true, value: numeric, error: null };
}

/** Human description of a bound, used for hints and error copy. */
export function describeBound(key) {
    const bound = MONEY_SETTING_BOUNDS[canonicalKey(key)];
    if (!bound) return '';
    if (bound.kind === 'ghs') {
        return `Any amount from ${bound.min} ${bound.unit}, two decimals.`;
    }
    if (bound.kind === 'bps') {
        return `${spreadPercent(bound.min)} to ${spreadPercent(bound.max)} (${bound.min}–${bound.max} bps).`;
    }
    return `Whole ${bound.unit} from ${bound.min} to ${bound.max}.`;
}

/** Display value for a stored setting value. */
export function displayValue(key, value) {
    const bound = MONEY_SETTING_BOUNDS[canonicalKey(key)];
    if (value === null || value === undefined || value === '') return '—';
    if (key === OWNER_RESOLVED_KEY) return String(value);
    if (!bound) return String(value);
    if (bound.kind === 'bps') {
        const pct = spreadPercent(value);
        return pct ? `${pct} (${value} bps)` : String(value);
    }
    if (bound.kind === 'ghs') return `${value} ${bound.unit}`;
    return `${value} ${bound.unit}`;
}

/** Whether a key may be edited at all, and why not when it may not. */
export function editableState(key) {
    if (key === OWNER_RESOLVED_KEY) {
        return { editable: false, reason: 'Owned by the Money Settings API: the owner resolved D1 to COMBINED_ESTIMATE, but writes stay disabled until the backend and money.settings.write exist.' };
    }
    if (!MONEY_SETTING_BOUNDS[key]) {
        return { editable: false, reason: 'Not an editable money setting.' };
    }
    return { editable: true, reason: null };
}

/** Fail closed: an admin without the explicit permission gets no write controls. */
export function canWriteMoneySettings(admin) {
    if (!admin) return false;
    const perms = admin.permissions ?? admin.permission_ids ?? [];
    if (!Array.isArray(perms)) return false;
    return perms.includes(MONEY_SETTINGS_WRITE_PERMISSION);
}

/** Confirmation copy: selected value, when it takes effect and why. */
export function buildConfirmation(key, rawValue, effectiveAt, note = '') {
    const meta = MONEY_SETTING_META[canonicalKey(key)];
    const validated = validateSettingValue(key, rawValue);
    return {
        key: canonicalKey(key),
        label: meta?.label || key,
        rawValue: String(rawValue ?? ''),
        valid: validated.ok,
        error: validated.error,
        displayValue: validated.ok ? displayValue(key, validated.value) : String(rawValue ?? ''),
        effectiveAt: effectiveAt || '',
        note,
    };
}

/**
 * The screen's decision model. The page renders exactly this; tests assert it.
 * @returns {object}
 */
export function buildMoneySettingsModel({ admin, snapshot, mode, error }) {
    const canWrite = canWriteMoneySettings(admin);
    const unavailable = Boolean(error) || !snapshot;
    const settings = (snapshot?.settings || []).map((entry) => {
        const { editable, reason } = editableState(entry.key);
        const meta = MONEY_SETTING_META[entry.key] || {};
        return {
            key: entry.key,
            label: meta.label || entry.key,
            group: meta.group || 'Other',
            description: meta.description || '',
            display: displayValue(entry.key, entry.value),
            effectiveFrom: entry.effectiveFrom ?? null,
            source: entry.source ?? null,
            editable: editable && canWrite,
            reason: reason || (canWrite ? null : 'Requires the money.settings.write permission.'),
            pendingOwnerDecision: Boolean(meta.pendingOwnerDecision),
            boundHint: describeBound(entry.key),
        };
    });
    return {
        mode,
        canWrite,
        unavailable,
        errorText: error ? String(error) : null,
        settings,
        groups: [...new Set(settings.map((s) => s.group))],
        flags: READ_ONLY_FLAGS.map((flag) => ({
            ...flag,
            value: snapshot?.flags ? snapshot.flags[flag.key] ?? null : null,
        })),
        flagWritesAllowed: false,
        headlineModePending: true,
    };
}
