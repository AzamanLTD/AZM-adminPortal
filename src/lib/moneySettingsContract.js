/**
 * Money Settings — contract layer (directive 1-E).
 *
 * Everything in this module is pure: bounds, exact-decimal validation, the
 * render model the screen consumes, and the permission decision. The screen
 * is a thin renderer over `buildMoneySettingsModel`, which is why the ten
 * required behaviours are testable without a DOM.
 *
 * MONEY RULE: GHS amounts are authoritative and are validated as DECIMAL
 * STRINGS compared as integer pesewas. No JavaScript floating-point
 * arithmetic is used to accept or reject an authoritative money value.
 */

/** The single write permission for this screen. */
export const MONEY_SETTINGS_WRITE = 'money.settings.write';

/** Decimal GHS: up to 12 integer digits, at most 2 decimals, no signs/exponents. */
export const GHS_DECIMAL_PATTERN = /^(0|[1-9]\d{0,11})(\.\d{1,2})?$/;

/**
 * Bounds for the settings that have an agreed technical shape.
 * `ghs` bounds are decimal strings; `int`/`bps` bounds are integers.
 * These mirror directive 1-E and are the ONLY place bounds are defined.
 */
export const MONEY_SETTING_BOUNDS = {
    'quoteTtl.payment_topup': { kind: 'int', min: 60, max: 3600, unit: 'seconds' },
    'quoteTtl.bucket_convert': { kind: 'int', min: 60, max: 3600, unit: 'seconds' },
    'fxSpread.payment_topup.GHS_USDC': { kind: 'bps', min: 0, max: 500, unit: 'basis points' },
    'fxSpread.payment_topup.USDC_GHS': { kind: 'bps', min: 0, max: 500, unit: 'basis points' },
    'fxSpread.bucket_convert.GHS_USDC': { kind: 'bps', min: 0, max: 500, unit: 'basis points' },
    'fxSpread.bucket_convert.USDC_GHS': { kind: 'bps', min: 0, max: 500, unit: 'basis points' },
    stepUpThresholdGhs: { kind: 'ghs', min: '1.00', max: '100000.00', unit: 'GHS' },
};

/**
 * Settings the screen may present. `ownerPending: true` settings are shown so
 * the shape and the trade-off are visible, but they are NEVER written: the
 * directive contradicts itself on D1 (part 3.1 calls COMBINED_ESTIMATE decided,
 * part 3.2 marks D1 pending), so the owner must resolve it.
 */
export const MONEY_SETTING_META = {
    'quoteTtl.payment_topup': {
        group: 'Quote lifetime',
        label: 'Payment top-up quote TTL',
        description: 'How long a top-up quote stays payable before the customer must re-quote.',
    },
    'quoteTtl.bucket_convert': {
        group: 'Quote lifetime',
        label: 'Bucket convert quote TTL',
        description: 'How long a bucket conversion quote stays valid.',
    },
    'fxSpread.payment_topup.GHS_USDC': {
        group: 'FX spread — payment top-up',
        label: 'GHS → USDC',
        description: 'Spread applied when a top-up converts GHS into USDC.',
    },
    'fxSpread.payment_topup.USDC_GHS': {
        group: 'FX spread — payment top-up',
        label: 'USDC → GHS',
        description: 'Spread applied when a top-up settles back into GHS.',
    },
    'fxSpread.bucket_convert.GHS_USDC': {
        group: 'FX spread — bucket convert',
        label: 'GHS → USDC',
        description: 'Spread applied when converting a bucket balance from GHS into USDC.',
    },
    'fxSpread.bucket_convert.USDC_GHS': {
        group: 'FX spread — bucket convert',
        label: 'USDC → GHS',
        description: 'Spread applied when converting a bucket balance from USDC into GHS.',
    },
    stepUpThresholdGhs: {
        group: 'Step-up',
        label: 'Step-up threshold',
        description: 'GHS amount at or above which an action requires a second factor.',
    },
    balanceHeadlineMode: {
        group: 'Balance headline',
        label: 'Headline mode',
        description: 'Whether the member balance card headlines the combined GHS estimate or the '
            + 'GHS ledger alone. GHS remains the canonical displayed balance in both modes; '
            + 'the USDC figure stays an indicative equivalent, never spendable GHS.',
        ownerPending: true,
    },
};

/**
 * Rollout flags. Read-only by construction: they are not in
 * MONEY_SETTING_BOUNDS, have no meta, no validator and no gateway write path,
 * and `buildMoneySettingsModel` exposes them as display-only rows.
 */
export const READ_ONLY_FLAGS = [
    {
        key: 'nativeGhsSettlementEnabled',
        label: 'Native GHS settlement',
        explanation: 'Settlement of collected GHS in its native regime. Changing this is an owner '
            + 'rollout decision with accounting consequences and is never done from this screen.',
    },
    {
        key: 'nativeGhsWithdrawalEnabled',
        label: 'Native GHS withdrawal',
        explanation: 'Withdrawal of held GHS under the native regime, including its authority latch.',
    },
    {
        key: 'fiatLiquidityAuthorityEnabled',
        label: 'Fiat liquidity authority',
        explanation: 'Which component is authoritative for fiat liquidity snapshots.',
    },
    {
        key: 'modelBSettlementEnabled',
        label: 'Model B settlement',
        explanation: 'Model B settlement route for merchant flows.',
    },
];

/** Integer pesewas from a decimal GHS string. String maths only, no floats. */
export function ghsToPesewas(decimal) {
    if (typeof decimal !== 'string' || !GHS_DECIMAL_PATTERN.test(decimal)) return null;
    const [whole, frac = ''] = decimal.split('.');
    const pesewas = `${whole}${(frac + '00').slice(0, 2)}`;
    return BigInt(pesewas);
}

/** Compare two validated GHS decimal strings. */
export function compareGhs(a, b) {
    const pa = ghsToPesewas(a);
    const pb = ghsToPesewas(b);
    if (pa === null || pb === null) return null;
    return pa === pb ? 0 : (pa > pb ? 1 : -1);
}

/**
 * Validate one setting value against its declared bound.
 * @returns {{ok: true, value: string|number} | {ok: false, error: string}}
 */
export function validateSettingValue(key, raw) {
    const bound = MONEY_SETTING_BOUNDS[key];
    if (!bound) return { ok: false, error: 'This setting has no agreed technical shape yet.' };
    const text = typeof raw === 'string' ? raw.trim() : raw;

    if (bound.kind === 'ghs') {
        if (typeof text !== 'string' || !GHS_DECIMAL_PATTERN.test(text)) {
            return { ok: false, error: 'Enter a GHS amount as digits with at most two decimals.' };
        }
        if (compareGhs(text, bound.min) < 0) return { ok: false, error: `Minimum is ${bound.min} GHS.` };
        if (compareGhs(text, bound.max) > 0) return { ok: false, error: `Maximum is ${bound.max} GHS.` };
        return { ok: true, value: text };
    }

    if (typeof text === 'string' && text !== '' && !/^\d+$/.test(text)) {
        return { ok: false, error: 'Whole numbers only.' };
    }
    const numeric = typeof text === 'number' ? text : Number(text);
    if (!Number.isInteger(numeric)) return { ok: false, error: 'Whole numbers only.' };
    if (numeric < bound.min) return { ok: false, error: `Minimum is ${bound.min} ${bound.unit}.` };
    if (numeric > bound.max) return { ok: false, error: `Maximum is ${bound.max} ${bound.unit}.` };
    return { ok: true, value: numeric };
}

/** Human description of a bound, used for hints and error copy. */
export function describeBound(key) {
    const bound = MONEY_SETTING_BOUNDS[key];
    if (!bound) return 'No agreed bound yet.';
    return bound.kind === 'ghs'
        ? `${bound.min} to ${bound.max} GHS, exact decimals`
        : `${bound.min} to ${bound.max} ${bound.unit}`;
}

/**
 * Permission decision. An admin without a permission list is treated as having
 * no money permissions — absence must never read as "allowed".
 */
export function canWriteMoneySettings(admin) {
    if (!admin) return false;
    const perms = Array.isArray(admin.permissions) ? admin.permissions : [];
    if (perms.includes(MONEY_SETTINGS_WRITE)) return true;
    return false;
}

/**
 * The screen's entire decision surface, pure and testable.
 *
 * @param {object} input
 * @param {object|null} input.admin            authenticated admin
 * @param {object|null} input.snapshot         { settings, flags, revisions } or null
 * @param {string|null} input.error            gateway error code/message
 * @param {'live'|'mock'} input.gatewayMode
 */
export function buildMoneySettingsModel({ admin, snapshot, error = null, gatewayMode = 'mock' }) {
    const canWrite = canWriteMoneySettings(admin);
    const unavailable = Boolean(error) || !snapshot;

    const groups = Object.entries(MONEY_SETTING_META).reduce((acc, [key, meta]) => {
        const existing = acc.find((g) => g.group === meta.group) || { group: meta.group, rows: [] };
        const value = snapshot?.settings ? snapshot.settings[key] : undefined;
        const bound = MONEY_SETTING_BOUNDS[key] || null;
        const editable = Boolean(bound) && !meta.ownerPending && canWrite && !unavailable;
        existing.rows.push({
            key,
            label: meta.label,
            description: meta.description,
            bound: bound ? describeBound(key) : null,
            value: value === undefined ? null : value,
            editable,
            ownerPending: Boolean(meta.ownerPending),
            pendingNote: meta.ownerPending
                ? 'Pending owner confirmation of D1. This cannot be written from this screen.'
                : null,
        });
        if (!acc.includes(existing)) acc.push(existing);
        return acc;
    }, []);

    return {
        canWrite,
        gatewayMode,
        unavailable,
        unavailableReason: unavailable
            ? (error || 'Money settings are unavailable. Nothing on this screen is editable until the API answers.')
            : null,
        groups,
        flags: READ_ONLY_FLAGS.map((flag) => ({
            ...flag,
            value: snapshot?.flags ? snapshot.flags[flag.key] : null,
        })),
        revisions: Array.isArray(snapshot?.revisions) ? snapshot.revisions : [],
        // Explicit: no write path exists for a flag anywhere in this module.
        flagWritesAllowed: false,
    };
}

/** Confirmation copy: the selected value and when it takes effect, before saving. */
export function buildConfirmation(key, rawValue, effectiveAt) {
    const meta = MONEY_SETTING_META[key];
    const bound = MONEY_SETTING_BOUNDS[key];
    const validated = validateSettingValue(key, rawValue);
    return {
        key,
        label: meta?.label || key,
        rawValue: String(rawValue ?? ''),
        valid: validated.ok,
        error: validated.ok ? null : validated.error,
        displayValue: validated.ok
            ? (bound.kind === 'ghs' ? `${validated.value} GHS` : `${validated.value} ${bound.unit}`)
            : String(rawValue ?? ''),
        effectiveAt,
    };
}
