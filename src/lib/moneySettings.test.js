import { describe, it, expect } from 'vitest';
import {
    MONEY_SETTING_BOUNDS,
    MONEY_SETTING_META,
    MONEY_SETTINGS_WRITE,
    READ_ONLY_FLAGS,
    buildConfirmation,
    buildMoneySettingsModel,
    canWriteMoneySettings,
    compareGhs,
    describeBound,
    ghsToPesewas,
    validateSettingValue,
} from '@/lib/moneySettingsContract';
import {
    MONEY_SETTINGS_INVALID,
    MONEY_SETTINGS_UNAVAILABLE,
    createLiveMoneySettingsGateway,
    createMockMoneySettingsGateway,
    resolveMoneySettingsGateway,
} from '@/lib/moneySettingsGateway';

const ADMIN_WITH_WRITE = { role: 'ADMIN', permissions: [MONEY_SETTINGS_WRITE] };
const ADMIN_WITHOUT = { role: 'ADMIN', permissions: ['users.read'] };
const ADMIN_SHAPELESS = { role: 'ADMIN' };

const SNAPSHOT = {
    settings: {
        'quoteTtl.payment_topup': 300,
        'quoteTtl.bucket_convert': 120,
        'fxSpread.payment_topup.GHS_USDC': 50,
        'fxSpread.payment_topup.USDC_GHS': 50,
        'fxSpread.bucket_convert.GHS_USDC': 25,
        'fxSpread.bucket_convert.USDC_GHS': 25,
        stepUpThresholdGhs: '500.00',
        balanceHeadlineMode: 'GHS_LEDGER',
    },
    flags: {
        nativeGhsSettlementEnabled: false,
        nativeGhsWithdrawalEnabled: false,
        fiatLiquidityAuthorityEnabled: false,
        modelBSettlementEnabled: false,
    },
    revisions: {},
};

describe('money settings — permission gating', () => {
    it('requires money.settings.write, and treats a missing permission list as no access', () => {
        expect(canWriteMoneySettings(ADMIN_WITH_WRITE)).toBe(true);
        expect(canWriteMoneySettings(ADMIN_WITHOUT)).toBe(false);
        expect(canWriteMoneySettings(ADMIN_SHAPELESS)).toBe(false);
        expect(canWriteMoneySettings(null)).toBe(false);
    });

    it('renders every row read-only when the permission is absent', () => {
        const model = buildMoneySettingsModel({ admin: ADMIN_WITHOUT, snapshot: SNAPSHOT, gatewayMode: 'mock' });
        expect(model.canWrite).toBe(false);
        const rows = model.groups.flatMap((g) => g.rows);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((r) => r.editable === false)).toBe(true);
    });

    it('makes bounded, non-pending rows editable when the permission is present', () => {
        const model = buildMoneySettingsModel({ admin: ADMIN_WITH_WRITE, snapshot: SNAPSHOT, gatewayMode: 'mock' });
        const rows = model.groups.flatMap((g) => g.rows);
        const ttl = rows.find((r) => r.key === 'quoteTtl.payment_topup');
        const headline = rows.find((r) => r.key === 'balanceHeadlineMode');
        expect(ttl.editable).toBe(true);
        expect(headline.editable).toBe(false);
        expect(headline.ownerPending).toBe(true);
    });
});

describe('money settings — rollout flags are read-only', () => {
    it('exposes flags for display only and states that no write path exists', () => {
        const model = buildMoneySettingsModel({ admin: ADMIN_WITH_WRITE, snapshot: SNAPSHOT, gatewayMode: 'mock' });
        expect(model.flagWritesAllowed).toBe(false);
        expect(model.flags.map((f) => f.key)).toEqual(READ_ONLY_FLAGS.map((f) => f.key));
        expect(model.flags[0].value).toBe(false);
    });

    it('has no bound, no meta entry and therefore no valid edit for any flag key', () => {
        for (const flag of READ_ONLY_FLAGS) {
            expect(MONEY_SETTING_BOUNDS[flag.key]).toBeUndefined();
            expect(MONEY_SETTING_META[flag.key]).toBeUndefined();
            expect(validateSettingValue(flag.key, 'true').ok).toBe(false);
        }
    });

    it('gives the mock gateway no flag-specific operation and records no flag write', async () => {
        const gateway = createMockMoneySettingsGateway(SNAPSHOT);
        await gateway.get();
        expect(gateway.calls.map((c) => c.op)).toEqual(['get']);
        expect(gateway.calls.some((c) => READ_ONLY_FLAGS.some((f) => f.key === c.key))).toBe(false);
    });

    it('exposes exactly the three documented live operations', () => {
        const http = { request: async () => ({ status: 200, data: { settings: {}, flags: {}, revisions: [] } }) };
        const live = createLiveMoneySettingsGateway(http);
        expect(Object.keys(live).sort()).toEqual(['get', 'history', 'mode', 'update']);
    });
});

describe('money settings — numeric bounds', () => {
    it('accepts the exact minimum and maximum and rejects just outside for every bounded key', () => {
        for (const [key, bound] of Object.entries(MONEY_SETTING_BOUNDS)) {
            if (bound.kind === 'ghs') {
                expect(validateSettingValue(key, bound.min).ok).toBe(true);
                expect(validateSettingValue(key, bound.max).ok).toBe(true);
                expect(validateSettingValue(key, '0.99').ok).toBe(false);
                expect(validateSettingValue(key, '100000.01').ok).toBe(false);
            } else {
                expect(validateSettingValue(key, bound.min).ok).toBe(true);
                expect(validateSettingValue(key, bound.max).ok).toBe(true);
                expect(validateSettingValue(key, bound.min - 1).ok).toBe(false);
                expect(validateSettingValue(key, bound.max + 1).ok).toBe(false);
            }
            expect(describeBound(key)).toContain(String(bound.kind === 'ghs' ? bound.min : bound.min));
        }
    });

    it('rejects non-integer and negative values for integer bounds', () => {
        expect(validateSettingValue('quoteTtl.payment_topup', '60.5').ok).toBe(false);
        expect(validateSettingValue('quoteTtl.payment_topup', '-60').ok).toBe(false);
        expect(validateSettingValue('quoteTtl.payment_topup', 'sixty').ok).toBe(false);
        expect(validateSettingValue('quoteTtl.payment_topup', '').ok).toBe(false);
    });
});

describe('money settings — exact decimal validation', () => {
    it('accepts only plain decimals with at most two places', () => {
        expect(validateSettingValue('stepUpThresholdGhs', '500.00').ok).toBe(true);
        expect(validateSettingValue('stepUpThresholdGhs', '500').ok).toBe(true);
        expect(validateSettingValue('stepUpThresholdGhs', '500.5').ok).toBe(true);
        expect(validateSettingValue('stepUpThresholdGhs', '500.555').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', '1e3').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', '0x10').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', ' 500.00 ').ok).toBe(true);
        expect(validateSettingValue('stepUpThresholdGhs', '0500.00').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', '500,00').ok).toBe(false);
    });

    it('never uses floating point to compare authoritative GHS amounts', () => {
        // 0.1 + 0.2 !== 0.3 in floats; as pesewas these are exact.
        expect(ghsToPesewas('0.10')).toBe(10n);
        expect(ghsToPesewas('0.20')).toBe(20n);
        expect(compareGhs('999999999999.99', '100000.00')).toBe(1);
        expect(compareGhs('1.00', '1.00')).toBe(0);
        expect(compareGhs('1.00', '1.01')).toBe(-1);
        expect(ghsToPesewas('1.5')).toBe(150n);
        expect(ghsToPesewas('nope')).toBeNull();
    });
});

describe('money settings — effective-date confirmation', () => {
    it('carries the selected value and the effective time into the confirmation', () => {
        const confirmation = buildConfirmation('stepUpThresholdGhs', '750.50', '2026-11-09T00:00');
        expect(confirmation.valid).toBe(true);
        expect(confirmation.displayValue).toBe('750.50 GHS');
        expect(confirmation.effectiveAt).toBe('2026-11-09T00:00');
    });

    it('reports the validation error instead of a display value when the draft is invalid', () => {
        const confirmation = buildConfirmation('stepUpThresholdGhs', '999999.00', '2026-11-09T00:00');
        expect(confirmation.valid).toBe(false);
        expect(confirmation.displayValue).toBe('999999.00');
        expect(confirmation.error).toMatch(/Maximum/);
    });

    it('records the effective time on the write', async () => {
        const gateway = createMockMoneySettingsGateway(SNAPSHOT);
        await gateway.update('stepUpThresholdGhs', '750.50', '2026-11-09T00:00');
        expect(gateway.calls.at(-1)).toMatchObject({
            op: 'update',
            key: 'stepUpThresholdGhs',
            value: '750.50',
            effectiveAt: '2026-11-09T00:00',
        });
    });
});

describe('money settings — history', () => {
    it('returns the revisions the gateway recorded, with actor and effective time', async () => {
        const gateway = createMockMoneySettingsGateway(SNAPSHOT);
        await gateway.update('quoteTtl.payment_topup', 600, '2026-11-10T00:00');
        const history = await gateway.history('quoteTtl.payment_topup');
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ from: 300, to: 600, effectiveAt: '2026-11-10T00:00', revision: 1 });
        expect(history[0].actor).toBeTruthy();
    });

    it('does not invent history when none exists', async () => {
        const gateway = createMockMoneySettingsGateway(SNAPSHOT);
        expect(await gateway.history('quoteTtl.bucket_convert')).toEqual([]);
    });
});

describe('money settings — mock and unavailable rendering', () => {
    it('renders the mock document, including the pending headline decision', () => {
        const model = buildMoneySettingsModel({ admin: ADMIN_WITH_WRITE, snapshot: SNAPSHOT, gatewayMode: 'mock' });
        const rows = model.groups.flatMap((g) => g.rows);
        expect(rows.find((r) => r.key === 'stepUpThresholdGhs').value).toBe('500.00');
        expect(rows.find((r) => r.key === 'balanceHeadlineMode').pendingNote).toMatch(/Pending owner confirmation/);
        expect(model.gatewayMode).toBe('mock');
    });

    it('shows an honest unavailable state and no editable rows when the API cannot answer', async () => {
        const gateway = createMockMoneySettingsGateway({ ...SNAPSHOT, unavailable: true });
        await expect(gateway.get()).rejects.toMatchObject({ code: MONEY_SETTINGS_UNAVAILABLE });
        const model = buildMoneySettingsModel({
            admin: ADMIN_WITH_WRITE,
            snapshot: null,
            error: 'Money settings API is unreachable.',
            gatewayMode: 'live',
        });
        expect(model.unavailable).toBe(true);
        expect(model.unavailableReason).toMatch(/unreachable/);
        expect(model.groups.flatMap((g) => g.rows).every((r) => r.editable === false)).toBe(true);
        expect(model.flags.every((f) => f.value === null)).toBe(true);
    });

    it('refuses to hand back a mock gateway when none was explicitly configured', () => {
        expect(() => resolveMoneySettingsGateway({ mode: 'unknown' })).toThrowError();
        expect(() => resolveMoneySettingsGateway({ mode: 'live', http: null })).toThrowError();
        expect(resolveMoneySettingsGateway({ mode: 'mock' }).mode).toBe('mock');
    });
});

describe('money settings — save failures are surfaced, never swallowed', () => {
    it('propagates the API rejection so the screen can say nothing changed', async () => {
        const gateway = createMockMoneySettingsGateway({ ...SNAPSHOT, failWrites: 'API rejected this value.' });
        await expect(gateway.update('quoteTtl.payment_topup', 600, '2026-11-10T00:00'))
            .rejects.toMatchObject({ code: MONEY_SETTINGS_INVALID, message: 'API rejected this value.' });
    });

    it('maps a 403 from the live API to a permission error and a 500 to unavailable', async () => {
        const forbidden = createLiveMoneySettingsGateway({ request: async () => ({ status: 403 }) });
        await expect(forbidden.get()).rejects.toMatchObject({ code: 'MONEY_SETTINGS_FORBIDDEN' });
        const broken = createLiveMoneySettingsGateway({ request: async () => ({ status: 500 }) });
        await expect(broken.get()).rejects.toMatchObject({ code: MONEY_SETTINGS_UNAVAILABLE });
    });
});
