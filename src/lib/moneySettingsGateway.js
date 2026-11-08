/**
 * Money Settings gateway (directive 1-E).
 *
 * Three shapes only, exactly as proposed:
 *   GET  /api/admin/money-settings
 *   PUT  /api/admin/money-settings/:key
 *   GET  /api/admin/money-settings/:key/history
 *
 * The backend endpoint is NOT confirmed as implemented, so this module ships a
 * typed mock and a live client behind ONE interface. Production never falls
 * back to the mock: `resolveMoneySettingsGateway` refuses to hand back a mock
 * in a production build, and an unreachable live API surfaces as an explicit
 * unavailable error rather than invented settings.
 */

export const MONEY_SETTINGS_UNAVAILABLE = 'MONEY_SETTINGS_UNAVAILABLE';
export const MONEY_SETTINGS_FORBIDDEN = 'MONEY_SETTINGS_FORBIDDEN';
export const MONEY_SETTINGS_INVALID = 'MONEY_SETTINGS_INVALID';

export class MoneySettingsError extends Error {
    constructor(code, message, cause) {
        super(message);
        this.name = 'MoneySettingsError';
        this.code = code;
        this.cause = cause;
    }
}

const BASE = '/api/admin/money-settings';

/** Live client. Any transport/shape failure becomes an honest unavailable error. */
export function createLiveMoneySettingsGateway(http) {
    async function call(method, path, body) {
        let response;
        try {
            response = await http.request({ method, path: `${BASE}${path}`, body });
        } catch (cause) {
            throw new MoneySettingsError(
                MONEY_SETTINGS_UNAVAILABLE,
                'Money settings API is unreachable. No values are shown because none were returned.',
                cause,
            );
        }
        if (response?.status === 403) {
            throw new MoneySettingsError(MONEY_SETTINGS_FORBIDDEN, 'You do not have permission to view money settings.');
        }
        if (response?.status === 422 || response?.status === 400) {
            throw new MoneySettingsError(MONEY_SETTINGS_INVALID, response?.data?.message || 'The API rejected this value.');
        }
        if (!response || response.status >= 500 || !response.data) {
            throw new MoneySettingsError(
                MONEY_SETTINGS_UNAVAILABLE,
                'Money settings API did not return a usable document.',
            );
        }
        return response.data;
    }

    return {
        mode: 'live',
        async get() {
            const data = await call('GET', '');
            return { settings: data.settings ?? null, flags: data.flags ?? null, revisions: data.revisions ?? [] };
        },
        async update(key, value, effectiveAt) {
            const data = await call('PUT', `/${encodeURIComponent(key)}`, { value, effectiveAt });
            return data.setting ?? data;
        },
        async history(key) {
            const data = await call('GET', `/${encodeURIComponent(key)}/history`);
            return Array.isArray(data.revisions) ? data.revisions : [];
        },
    };
}

/**
 * Typed mock. Records every call so tests can prove what the screen did (and
 * that a flag was never written). `unavailable` and `failWrites` exist so the
 * error states are exercised with real failure paths, not by asserting on copy.
 */
export function createMockMoneySettingsGateway({
    settings = {},
    flags = {},
    revisions = {},
    unavailable = false,
    failWrites = null,
} = {}) {
    const calls = [];
    const state = { ...settings };
    const history = Object.fromEntries(Object.entries(revisions).map(([k, v]) => [k, [...v]]));

    return {
        mode: 'mock',
        calls,
        async get() {
            calls.push({ op: 'get' });
            if (unavailable) {
                throw new MoneySettingsError(MONEY_SETTINGS_UNAVAILABLE, 'Mock gateway is configured as unavailable.');
            }
            return { settings: { ...state }, flags: { ...flags }, revisions: history };
        },
        async update(key, value, effectiveAt) {
            calls.push({ op: 'update', key, value, effectiveAt });
            if (unavailable) {
                throw new MoneySettingsError(MONEY_SETTINGS_UNAVAILABLE, 'Mock gateway is configured as unavailable.');
            }
            if (failWrites) {
                throw new MoneySettingsError(MONEY_SETTINGS_INVALID, failWrites);
            }
            const previous = state[key];
            state[key] = value;
            history[key] = [
                ...(history[key] || []),
                { key, from: previous ?? null, to: value, effectiveAt, actor: 'mock.admin', revision: (history[key]?.length || 0) + 1 },
            ];
            return { key, value, effectiveAt };
        },
        async history(key) {
            calls.push({ op: 'history', key });
            if (unavailable) {
                throw new MoneySettingsError(MONEY_SETTINGS_UNAVAILABLE, 'Mock gateway is configured as unavailable.');
            }
            return [...(history[key] || [])];
        },
    };
}

/**
 * Explicit gateway selection.
 * - 'live' is always allowed.
 * - 'mock' is allowed only when explicitly requested AND the build is not a
 *   production build. There is no implicit fallback anywhere.
 */
/**
 * @param {{mode?: 'live'|'mock', http?: any, mockOptions?: object}} [options]
 */
export function resolveMoneySettingsGateway({ mode, http = null, mockOptions = {} } = {}) {
    const isProductionBuild = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.PROD);
    if (mode === 'live') {
        if (!http) throw new MoneySettingsError(MONEY_SETTINGS_UNAVAILABLE, 'Live gateway requires an HTTP client.');
        return createLiveMoneySettingsGateway(http);
    }
    if (mode === 'mock') {
        if (isProductionBuild) {
            throw new MoneySettingsError(
                MONEY_SETTINGS_UNAVAILABLE,
                'Mock money settings are refused in a production build.',
            );
        }
        return createMockMoneySettingsGateway(mockOptions);
    }
    throw new MoneySettingsError(MONEY_SETTINGS_UNAVAILABLE, 'No money settings gateway was configured.');
}
