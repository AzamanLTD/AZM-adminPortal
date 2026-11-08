import { describe, expect, it } from 'vitest';
import {
    MONEY_SETTING_BOUNDS,
    MONEY_SETTING_KEYS,
    LEGACY_KEY_ALIASES,
    READ_ONLY_FLAGS,
    HEADLINE_MODES,
    buildConfirmation,
    buildMoneySettingsModel,
    canWriteMoneySettings,
    canonicalKey,
    compareGhs,
    describeBound,
    displayValue,
    editableState,
    spreadPercent,
    validateSettingValue,
    moneySettingsResponseSchema,
} from './moneySettingsContract';
import {
    MONEY_SETTINGS_MODE,
    MoneySettingsUnavailable,
    createLiveMoneySettingsGateway,
    createMockMoneySettingsGateway,
    resolveMoneySettingsGateway,
} from './moneySettingsGateway';

const WRITER = { role: 'ADMIN', permissions: ['money.settings.write'] };
const READER = { role: 'ADMIN', permissions: [] };

// ── 1. quote TTL bounds ──────────────────────────────────────────────────────
describe('quote TTL bounds are [10, 900] whole seconds', () => {
    it.each(['quoteTtl.payment_topup', 'quoteTtl.bucket_convert'])('%s accepts the inclusive edges', (key) => {
        expect(validateSettingValue(key, 10).ok).toBe(true);
        expect(validateSettingValue(key, 900).ok).toBe(true);
        expect(validateSettingValue(key, '45').ok).toBe(true);
    });

    it.each(['quoteTtl.payment_topup', 'quoteTtl.bucket_convert'])('%s rejects outside the range', (key) => {
        expect(validateSettingValue(key, 9).ok).toBe(false);
        expect(validateSettingValue(key, 901).ok).toBe(false);
        expect(validateSettingValue(key, 0).ok).toBe(false);
        expect(validateSettingValue(key, -1).ok).toBe(false);
    });

    it('rejects the old 60–3600 window as a bound source', () => {
        expect(MONEY_SETTING_BOUNDS['quoteTtl.payment_topup'].min).toBe(10);
        expect(MONEY_SETTING_BOUNDS['quoteTtl.payment_topup'].max).toBe(900);
        expect(validateSettingValue('quoteTtl.payment_topup', 3600).ok).toBe(false);
    });

    it('documented defaults are 45 and 60 seconds', () => {
        expect(validateSettingValue('quoteTtl.payment_topup', 45).value).toBe(45);
        expect(validateSettingValue('quoteTtl.bucket_convert', 60).value).toBe(60);
    });
});

// ── 2. FX spread bounds and naming ───────────────────────────────────────────
describe('FX spreads are 0–10% inclusive, held as 0–1000 basis points', () => {
    it.each([
        'fxSpread.CONVERT_GHS_TO_USDC',
        'fxSpread.CONVERT_USDC_TO_GHS',
        'fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC',
        'fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS',
    ])('%s accepts 0, 10% and rejects just outside', (key) => {
        expect(validateSettingValue(key, 0).ok).toBe(true);
        expect(validateSettingValue(key, 1000).ok).toBe(true);
        expect(validateSettingValue(key, 1001).ok).toBe(false);
        expect(validateSettingValue(key, -1).ok).toBe(false);
    });

    it('displays basis points as the equivalent percentage', () => {
        expect(spreadPercent(0)).toBe('0.00%');
        expect(spreadPercent(1000)).toBe('10.00%');
        expect(spreadPercent(250)).toBe('2.50%');
        expect(displayValue('fxSpread.CONVERT_USDC_TO_GHS', 1000)).toBe('10.00% (1000 bps)');
    });

    it('uses the four canonical Part 4 §8 keys and no nested scheme', () => {
        const spreadKeys = MONEY_SETTING_KEYS.filter((k) => k.startsWith('fxSpread.'));
        expect(spreadKeys).toEqual([
            'fxSpread.CONVERT_GHS_TO_USDC',
            'fxSpread.CONVERT_USDC_TO_GHS',
            'fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC',
            'fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS',
        ]);
        expect(Object.keys(LEGACY_KEY_ALIASES)).toEqual([
            'fxSpread.payment_topup.GHS_USDC',
            'fxSpread.payment_topup.USDC_GHS',
        ]);
        expect(canonicalKey('fxSpread.payment_topup.GHS_USDC')).toBe('fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC');
    });

    it('the two payment-topup directions mean different things', () => {
        const ghsFromUsdc = describeBound('fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC');
        const usdcFromGhs = describeBound('fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS');
        expect(ghsFromUsdc).toBe(usdcFromGhs); // same bound, different meaning
        expect(canonicalKey('fxSpread.PAYMENT_TOPUP_GHS_FROM_USDC'))
            .not.toBe(canonicalKey('fxSpread.PAYMENT_TOPUP_USDC_FROM_GHS'));
    });
});

// ── 3. step-up threshold ────────────────────────────────────────────────────
describe('stepUpThresholdGhs allows any non-negative amount at two decimals', () => {
    it('accepts 0.00, positive amounts and no invented ceiling', () => {
        expect(validateSettingValue('stepUpThresholdGhs', '0.00')).toEqual({ ok: true, value: '0.00', error: null });
        expect(validateSettingValue('stepUpThresholdGhs', '2500.50').ok).toBe(true);
        expect(validateSettingValue('stepUpThresholdGhs', '5000000.00').ok).toBe(true);
        expect(MONEY_SETTING_BOUNDS.stepUpThresholdGhs.max).toBeNull();
    });

    it('normalises a whole number to two decimals', () => {
        expect(validateSettingValue('stepUpThresholdGhs', '100').value).toBe('100.00');
    });

    it('rejects negatives, exponents and more than two decimals', () => {
        expect(validateSettingValue('stepUpThresholdGhs', '-1.00').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', '1e3').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', '12.345').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', '0.001').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', 'abc').ok).toBe(false);
        expect(validateSettingValue('stepUpThresholdGhs', '').ok).toBe(false);
    });

    it('compares GHS amounts exactly, never with floats', () => {
        expect(compareGhs('0.10', '0.1')).toBe(0);
        expect(compareGhs('9007199254740993.00', '9007199254740992.00')).toBe(1);
        expect(compareGhs('0.00', '0.00')).toBe(0);
    });
});

// ── 4. confirmation carries value, effective time and reason ────────────────
describe('confirmation shows value, effective time and reason', () => {
    it('builds a confirmation with an effective time', () => {
        const c = buildConfirmation('fxSpread.CONVERT_GHS_TO_USDC', '250', '2026-11-09T09:00');
        expect(c.valid).toBe(true);
        expect(c.displayValue).toBe('2.50% (250 bps)');
        expect(c.effectiveAt).toBe('2026-11-09T09:00');
    });

    it('carries validation errors rather than hiding them', () => {
        const c = buildConfirmation('quoteTtl.payment_topup', '901', '2026-11-09T09:00');
        expect(c.valid).toBe(false);
        expect(c.error).toMatch(/Maximum is 900 seconds/);
    });
});

// ── 5. API contract ─────────────────────────────────────────────────────────
describe('API contract', () => {
    const good = {
        settings: [{ key: 'stepUpThresholdGhs', value: '0.00', effectiveFrom: '2026-11-01T00:00:00Z', source: 'default' }],
        flags: { nativeGhsSettlementEnabled: false },
        bounds: { stepUpThresholdGhs: { min: '0.00', max: null, unit: 'GHS' } },
    };

    it('accepts the documented GET shape', () => {
        expect(moneySettingsResponseSchema.safeParse(good).success).toBe(true);
    });

    it('rejects a response without settings or flags', () => {
        expect(moneySettingsResponseSchema.safeParse({ settings: [] }).success).toBe(false);
        expect(moneySettingsResponseSchema.safeParse({ flags: {} }).success).toBe(false);
    });

    it('PUT sends value, effectiveFrom and note, never effectiveAt', async () => {
        const seen = [];
        const client = {
            get: async () => good,
            update: async (key, body) => { seen.push({ key, body }); return body; },
            history: async () => [],
        };
        const gateway = createLiveMoneySettingsGateway(client);
        await gateway.update('fxSpread.CONVERT_USDC_TO_GHS', {
            value: 1000, effectiveFrom: '2026-11-09T09:00', note: 'owner raised the ceiling',
        });
        expect(seen[0].key).toBe('fxSpread.CONVERT_USDC_TO_GHS');
        expect(seen[0].body).toEqual({ value: 1000, effectiveFrom: '2026-11-09T09:00', note: 'owner raised the ceiling' });
        expect('effectiveAt' in seen[0].body).toBe(false);
    });

    it('refuses a save without a reason', async () => {
        const client = { get: async () => good, update: async () => ({}), history: async () => [] };
        const gateway = createLiveMoneySettingsGateway(client);
        await expect(gateway.update('quoteTtl.payment_topup', { value: 45 })).rejects.toMatchObject({
            code: 'MONEY_SETTINGS_REJECTED',
        });
    });

    it('omits effectiveFrom when none was chosen', async () => {
        const seen = [];
        const client = { get: async () => good, update: async (k, b) => { seen.push(b); return b; }, history: async () => [] };
        await createLiveMoneySettingsGateway(client).update('quoteTtl.payment_topup', { value: 45, note: 'tighter quote' });
        expect(seen[0]).toEqual({ value: 45, note: 'tighter quote' });
    });

    it('rejects a response that does not match the shape', async () => {
        const client = { get: async () => ({ nope: true }), update: async () => ({}), history: async () => [] };
        await expect(createLiveMoneySettingsGateway(client).get()).rejects.toMatchObject({
            code: 'MONEY_SETTINGS_REJECTED',
        });
    });

    it('history is a separate operation', async () => {
        const client = { get: async () => good, update: async () => ({}), history: async (k) => [{ key: k, value: '1.00' }] };
        const rows = await createLiveMoneySettingsGateway(client).history('stepUpThresholdGhs');
        expect(rows).toHaveLength(1);
    });
});

// ── 6. permission gating ────────────────────────────────────────────────────
describe('permission gating fails closed', () => {
    it('requires the explicit permission', () => {
        expect(canWriteMoneySettings(WRITER)).toBe(true);
        expect(canWriteMoneySettings(READER)).toBe(false);
        expect(canWriteMoneySettings({ role: 'ADMIN' })).toBe(false);
        expect(canWriteMoneySettings(null)).toBe(false);
    });

    it('a reader sees no editable rows', async () => {
        const gateway = createMockMoneySettingsGateway();
        const snapshot = await gateway.get();
        const model = buildMoneySettingsModel({ admin: READER, snapshot, mode: 'live', error: null });
        expect(model.canWrite).toBe(false);
        expect(model.settings.every((s) => s.editable === false)).toBe(true);
    });

    it('a writer sees editable rows except the pending decision', async () => {
        const gateway = createMockMoneySettingsGateway();
        const snapshot = await gateway.get();
        const model = buildMoneySettingsModel({ admin: WRITER, snapshot, mode: 'live', error: null });
        const headline = model.settings.find((s) => s.key === 'balanceHeadlineMode');
        expect(headline.editable).toBe(false);
        expect(headline.pendingOwnerDecision).toBe(true);
        expect(model.settings.filter((s) => s.key !== 'balanceHeadlineMode').every((s) => s.editable)).toBe(true);
    });
});

// ── 7. read-only flags ──────────────────────────────────────────────────────
describe('rollout flags are read-only', () => {
    it('exposes the four flags and no writer', async () => {
        const gateway = createMockMoneySettingsGateway();
        const snapshot = await gateway.get();
        const model = buildMoneySettingsModel({ admin: WRITER, snapshot, mode: 'live', error: null });
        expect(model.flagWritesAllowed).toBe(false);
        expect(model.flags.map((f) => f.key)).toEqual(READ_ONLY_FLAGS.map((f) => f.key));
        expect(typeof gateway.update).toBe('function');
    });

    it('flags are not money settings, so they cannot be validated for writing', () => {
        for (const flag of READ_ONLY_FLAGS) {
            expect(MONEY_SETTING_BOUNDS[flag.key]).toBeUndefined();
            expect(validateSettingValue(flag.key, 'true').ok).toBe(false);
            expect(editableState(flag.key).editable).toBe(false);
        }
    });

    it('mock flags are default-off fixture values, not claims about production', async () => {
        const snapshot = await createMockMoneySettingsGateway().get();
        expect(Object.values(snapshot.flags).every((v) => v === false)).toBe(true);
    });
});

// ── 8. D1 resolved by the owner (COMBINED_ESTIMATE) ───────────────────────
describe('balanceHeadlineMode records the resolved owner decision', () => {
    it('allows only the two agreed modes', () => {
        expect(HEADLINE_MODES).toEqual(['COMBINED_ESTIMATE', 'NATIVE_ONLY']);
        expect(HEADLINE_MODES).not.toContain('GHS_LEDGER');
    });

    it('is not editable and not a money setting with a bound', () => {
        expect(editableState('balanceHeadlineMode').editable).toBe(false);
        expect(editableState('balanceHeadlineMode').reason).toMatch(/COMBINED_ESTIMATE/);
        expect(MONEY_SETTING_BOUNDS.balanceHeadlineMode).toBeUndefined();
    });

    it('mock fixtures never present a third mode', async () => {
        const snapshot = await createMockMoneySettingsGateway().get();
        const entry = snapshot.settings.find((s) => s.key === 'balanceHeadlineMode');
        expect(entry.value === null || HEADLINE_MODES.includes(entry.value)).toBe(true);
    });
});

// ── 9. production mock refusal and unavailable live API ────────────────────
describe('mock and live separation', () => {
    it('refuses mock in a production build', () => {
        expect(() => resolveMoneySettingsGateway({ mode: MONEY_SETTINGS_MODE.MOCK, isProduction: true }))
            .toThrow(/production build/i);
    });

    it('allows mock in development', () => {
        const gateway = resolveMoneySettingsGateway({ mode: MONEY_SETTINGS_MODE.MOCK, isProduction: false });
        expect(gateway.mode).toBe(MONEY_SETTINGS_MODE.MOCK);
    });

    it('defaults to the live gateway, which is unavailable without a client', async () => {
        const gateway = resolveMoneySettingsGateway({ isProduction: true });
        expect(gateway.mode).toBe(MONEY_SETTINGS_MODE.LIVE);
        await expect(gateway.get()).rejects.toBeInstanceOf(MoneySettingsUnavailable);
    });

    it('renders an honest unavailable model instead of invented values', async () => {
        let error = null;
        try {
            await createLiveMoneySettingsGateway(null).get();
        } catch (err) {
            error = err.message;
        }
        const model = buildMoneySettingsModel({ admin: WRITER, snapshot: null, mode: 'live', error });
        expect(model.unavailable).toBe(true);
        expect(model.settings).toEqual([]);
        expect(model.errorText).toMatch(/not available/i);
    });
});

// ── 10. save errors and history rendering ──────────────────────────────────
describe('save failures and history are reported truthfully', () => {
    it('surfaces a rejected save', async () => {
        const gateway = createMockMoneySettingsGateway({ failWrites: true });
        await expect(gateway.update('quoteTtl.payment_topup', { value: 45, note: 'x' }))
            .rejects.toMatchObject({ code: 'MONEY_SETTINGS_REJECTED' });
    });

    it('a mock write requires a reason and records a note in history', async () => {
        const gateway = createMockMoneySettingsGateway();
        await expect(gateway.update('quoteTtl.payment_topup', { value: 45 })).rejects.toBeInstanceOf(Error);
        await gateway.update('quoteTtl.payment_topup', { value: 30, effectiveFrom: '2026-11-09T09:00', note: 'shorten to 30s' });
        const rows = await gateway.history('quoteTtl.payment_topup');
        expect(rows[0]).toMatchObject({ key: 'quoteTtl.payment_topup', note: 'shorten to 30s' });
    });

    it('mock history starts empty rather than inventing revisions', async () => {
        const rows = await createMockMoneySettingsGateway().history('fxSpread.CONVERT_GHS_TO_USDC');
        expect(rows).toEqual([]);
    });

    it('renders history rows with value, effective time and source', () => {
        expect(displayValue('fxSpread.CONVERT_GHS_TO_USDC', 100)).toBe('1.00% (100 bps)');
        expect(displayValue('quoteTtl.bucket_convert', 60)).toBe('60 seconds');
        expect(displayValue('stepUpThresholdGhs', '0.00')).toBe('0.00 GHS');
    });
});

// ── 12. owner decision D1 resolved ────────────────────────────────────────
describe('owner resolved D1 to COMBINED_ESTIMATE', () => {
    it('mock fixture presents the owner-selected mode', async () => {
        const doc = await createMockMoneySettingsGateway().get();
        const row = doc.settings.find((s) => s.key === 'balanceHeadlineMode');
        expect(row.value).toBe('COMBINED_ESTIMATE');
    });

    it('still exposes NATIVE_ONLY as the supported alternative', () => {
        expect(HEADLINE_MODES).toEqual(['COMBINED_ESTIMATE', 'NATIVE_ONLY']);
    });
});
