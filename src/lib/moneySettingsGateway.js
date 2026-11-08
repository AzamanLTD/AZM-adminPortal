import {
    moneySettingsResponseSchema,
    canonicalKey,
    MONEY_SETTING_KEYS,
    QUOTE_TTL_DEFAULTS,
} from './moneySettingsContract';

/**
 * Money settings gateway.
 *
 * The backend 1-E API is NOT implemented yet, so this module is deliberately
 * split: a live gateway that speaks the agreed contract and reports an honest
 * unavailable state when no client is supplied, and a mock gateway that is only
 * reachable when a caller explicitly asks for it outside a production build.
 */

export const MONEY_SETTINGS_MODE = { LIVE: 'live', MOCK: 'mock' };

export class MoneySettingsUnavailable extends Error {
    constructor(message = 'Money settings API is not available.') {
        super(message);
        this.name = 'MoneySettingsUnavailable';
        this.code = 'MONEY_SETTINGS_UNAVAILABLE';
    }
}

export class MoneySettingsRejected extends Error {
    constructor(message) {
        super(message);
        this.name = 'MoneySettingsRejected';
        this.code = 'MONEY_SETTINGS_REJECTED';
    }
}

/** A default-off flag row, used only to shape mock data. */
function mockSnapshot() {
    return {
        settings: MONEY_SETTING_KEYS.map((key) => ({
            key,
            value: key === 'balanceHeadlineMode'
                ? 'COMBINED_ESTIMATE'
                : (QUOTE_TTL_DEFAULTS[key] ?? (key === 'stepUpThresholdGhs' ? '0.00' : null)),
            effectiveFrom: null,
            source: 'mock',
        })),
        flags: {
            nativeGhsSettlementEnabled: false,
            nativeGhsWithdrawalEnabled: false,
            fiatLiquidityAuthorityEnabled: false,
            modelBSettlementEnabled: false,
        },
        bounds: {},
    };
}

/**
 * Live gateway over the existing AdminPortal API client (api.moneySettings).
 * No second HTTP or auth layer: the client owns base URL, token and refresh.
 */
export function createLiveMoneySettingsGateway(client) {
    if (!client || typeof client.get !== 'function') {
        return {
            mode: MONEY_SETTINGS_MODE.LIVE,
            async get() { throw new MoneySettingsUnavailable(); },
            async update() { throw new MoneySettingsUnavailable(); },
            async history() { throw new MoneySettingsUnavailable(); },
        };
    }
    return {
        mode: MONEY_SETTINGS_MODE.LIVE,
        async get() {
            const raw = await client.get();
            const parsed = moneySettingsResponseSchema.safeParse(raw);
            if (!parsed.success) {
                throw new MoneySettingsRejected('Money settings response did not match the agreed shape.');
            }
            return parsed.data;
        },
        async update(key, { value, effectiveFrom, note }) {
            if (!note || !String(note).trim()) {
                throw new MoneySettingsRejected('A reason is required for every money-settings change.');
            }
            const body = { value, note: String(note).trim() };
            if (effectiveFrom) body.effectiveFrom = effectiveFrom;
            return client.update(canonicalKey(key), body);
        },
        async history(key) {
            return client.history(canonicalKey(key));
        },
    };
}

/**
 * Mock gateway for tests and an explicitly selected development preview.
 * It never pretends a write succeeded unless the caller asked it to accept.
 */
export function createMockMoneySettingsGateway(options = {}) {
    const seed = options.seed || mockSnapshot();
    const state = {
        settings: seed.settings.map((s) => ({ ...s })),
        flags: { ...seed.flags },
        bounds: seed.bounds || {},
    };
    const revisions = options.history || [];
    const calls = [];
    const failWrites = options.failWrites === true;
    const unavailable = options.unavailable === true;

    return {
        mode: MONEY_SETTINGS_MODE.MOCK,
        calls,
        async get() {
            if (unavailable) throw new MoneySettingsUnavailable('Mock gateway is configured as unavailable.');
            return JSON.parse(JSON.stringify(state));
        },
        async update(key, payload) {
            calls.push({ op: 'update', key, payload });
            if (unavailable) throw new MoneySettingsUnavailable('Mock gateway is configured as unavailable.');
            if (failWrites) throw new MoneySettingsRejected('The server rejected this change.');
            if (!payload || !payload.note || !String(payload.note).trim()) {
                throw new MoneySettingsRejected('A reason is required for every money-settings change.');
            }
            const entry = state.settings.find((s) => s.key === key);
            if (!entry) throw new MoneySettingsRejected('Unknown money setting.');
            revisions.unshift({
                key,
                value: entry.value,
                effectiveFrom: entry.effectiveFrom,
                source: entry.source,
                note: payload.note,
            });
            entry.value = payload.value;
            entry.effectiveFrom = payload.effectiveFrom || entry.effectiveFrom;
            entry.source = 'mock-gateway';
            return { key, value: entry.value, effectiveFrom: entry.effectiveFrom };
        },
        async history(key) {
            if (unavailable) throw new MoneySettingsUnavailable('Mock gateway is configured as unavailable.');
            return revisions.filter((r) => r.key === key);
        },
    };
}

/**
 * Choose a gateway explicitly. Production never falls back to mock data: an
 * unset mode in a production build yields the unavailable live gateway.
 */
/**
 * @param {{mode?: string, client?: object|null, mockOptions?: object, isProduction?: boolean}} [options]
 */
export function resolveMoneySettingsGateway({ mode, client, mockOptions, isProduction } = {}) {
    if (mode === MONEY_SETTINGS_MODE.MOCK) {
        if (isProduction) {
            throw new MoneySettingsRejected('Mock money settings are not available in a production build.');
        }
        return createMockMoneySettingsGateway(mockOptions || {});
    }
    return createLiveMoneySettingsGateway(client || null);
}
