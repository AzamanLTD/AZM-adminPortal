import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHead, CardTitle, Button, Field, Input, Tag } from '@/components/forge';
import { useAuth } from '@/lib/AuthContext';
import { moneySettings as moneySettingsClient } from '@/lib/api';
import {
    MONEY_SETTING_META,
    buildConfirmation,
    buildMoneySettingsModel,
    describeBound,
    displayValue,
    editableState,
    validateSettingValue,
} from '@/lib/moneySettingsContract';
import {
    MONEY_SETTINGS_MODE,
    resolveMoneySettingsGateway,
} from '@/lib/moneySettingsGateway';

/**
 * Money Settings (directive 1-E).
 *
 * The live API is not implemented yet, so this screen is honest about that: it
 * asks the gateway for data, and when there is no usable client it renders an
 * unavailable state instead of inventing values. A mock gateway is only used
 * when a development preview selects it explicitly.
 */

function nowLocalInput() {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
}

export default function MoneySettings() {
    const { user } = useAuth();
    const previewMock = useMemo(() => {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search);
        return params.get('preview') === 'money-settings-mock';
    }, []);

    const gateway = useMemo(() => {
        try {
            return resolveMoneySettingsGateway({
                mode: previewMock ? MONEY_SETTINGS_MODE.MOCK : MONEY_SETTINGS_MODE.LIVE,
                client: moneySettingsClient,
                isProduction: Boolean(import.meta.env?.PROD),
            });
        } catch (err) {
            return resolveMoneySettingsGateway({ mode: MONEY_SETTINGS_MODE.LIVE, client: null });
        }
    }, [previewMock]);

    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [historyFor, setHistoryFor] = useState(null);
    const [historyRows, setHistoryRows] = useState(null);
    const [historyError, setHistoryError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await gateway.get();
            setSnapshot(data);
        } catch (err) {
            setSnapshot(null);
            setError(err?.message || 'Money settings are unavailable.');
        } finally {
            setLoading(false);
        }
    }, [gateway]);

    useEffect(() => { load(); }, [load]);

    const model = buildMoneySettingsModel({ admin: user, snapshot, mode: gateway.mode, error });

    const beginEdit = (setting) => {
        setEditing(setting);
        setSaveError(null);
        setConfirmation(buildConfirmation(setting.key, setting.rawValue ?? '', nowLocalInput()));
    };

    const onValueChange = (raw) => {
        setConfirmation((prev) => (prev ? buildConfirmation(prev.key, raw, prev.effectiveFrom) : prev));
    };

    const onEffectiveChange = (effectiveFrom) => {
        setConfirmation((prev) => (prev ? { ...prev, effectiveFrom } : prev));
    };

    const onNoteChange = (note) => {
        setConfirmation((prev) => (prev ? { ...prev, note } : prev));
    };

    const confirm = async () => {
        if (!confirmation || !model.canWrite) return;
        const validated = validateSettingValue(confirmation.key, confirmation.rawValue);
        if (!validated.ok) return;
        if (!confirmation.note || !confirmation.note.trim()) {
            setSaveError('A reason is required before saving a money setting.');
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            await gateway.update(confirmation.key, {
                value: validated.value,
                effectiveFrom: confirmation.effectiveFrom || undefined,
                note: confirmation.note.trim(),
            });
            setEditing(null);
            setConfirmation(null);
            await load();
        } catch (err) {
            setSaveError(err?.message || 'The change was not saved.');
        } finally {
            setSaving(false);
        }
    };

    const openHistory = async (key) => {
        setHistoryFor(key);
        setHistoryRows(null);
        setHistoryError(null);
        try {
            const rows = await gateway.history(key);
            setHistoryRows(Array.isArray(rows) ? rows : []);
        } catch (err) {
            setHistoryError(err?.message || 'History is unavailable.');
        }
    };

    return (
        <div className="space-y-4 p-4">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold">Money Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Quote lifetimes, FX spreads and the step-up threshold. Rollout flags below are read-only.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {model.mode === MONEY_SETTINGS_MODE.MOCK && <Tag tone="warn">Mock data — not a live integration</Tag>}
                    {!model.canWrite && <Tag tone="neutral">Read only — money.settings.write not granted</Tag>}
                    <Button variant="ghost" onClick={load} disabled={loading}>Refresh</Button>
                </div>
            </header>

            {model.unavailable && (
                <Card>
                    <CardBody>
                        <p className="font-medium">Money settings are unavailable.</p>
                        <p className="text-sm text-muted-foreground">
                            {model.errorText || 'No money-settings API is connected in this environment.'}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Nothing is shown rather than invented values, dates or actors.
                        </p>
                    </CardBody>
                </Card>
            )}

            {!model.unavailable && model.groups.map((group) => (
                <Card key={group}>
                    <CardHead><CardTitle>{group}</CardTitle></CardHead>
                    <CardBody>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-muted-foreground">
                                    <th className="py-2">Setting</th>
                                    <th className="py-2">Current</th>
                                    <th className="py-2">Effective from</th>
                                    <th className="py-2">Source</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {model.settings.filter((s) => s.group === group).map((setting) => (
                                    <tr key={setting.key} className="border-t border-border align-top">
                                        <td className="py-2 pr-3">
                                            <div className="font-medium">{setting.label}</div>
                                            <div className="text-xs text-muted-foreground">{setting.key}</div>
                                            <div className="text-xs text-muted-foreground">{setting.description}</div>
                                            <div className="text-xs text-muted-foreground">{setting.boundHint}</div>
                                        </td>
                                        <td className="py-2 pr-3">
                                            {setting.pendingOwnerDecision ? (
                                                <span className="text-muted-foreground">Pending owner decision D1</span>
                                            ) : setting.display}
                                        </td>
                                        <td className="py-2 pr-3">{setting.effectiveFrom || '—'}</td>
                                        <td className="py-2 pr-3">{setting.source || '—'}</td>
                                        <td className="py-2 text-right">
                                            {setting.editable && (
                                                <Button variant="secondary" onClick={() => beginEdit({ ...setting, rawValue: '' })}>
                                                    Change
                                                </Button>
                                            )}
                                            {!setting.editable && setting.reason && (
                                                <span className="text-xs text-muted-foreground">{setting.reason}</span>
                                            )}
                                            <Button variant="ghost" onClick={() => openHistory(setting.key)}>History</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            ))}

            <Card>
                <CardHead><CardTitle>Rollout flags (read-only)</CardTitle></CardHead>
                <CardBody>
                    <p className="mb-3 text-sm text-muted-foreground">
                        Informational. This portal has no control that can change these; they are changed by the backend release process.
                    </p>
                    <ul className="space-y-2 text-sm">
                        {model.flags.map((flag) => (
                            <li key={flag.key} className="border-t border-border pt-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium">{flag.label}</span>
                                    <Tag tone={flag.value === true ? 'warn' : 'neutral'}>
                                        {flag.value === null ? 'unknown' : String(flag.value)}
                                    </Tag>
                                </div>
                                <div className="text-xs text-muted-foreground">{flag.explanation}</div>
                                <div className="text-xs text-muted-foreground">{flag.key}</div>
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            {editing && confirmation && (
                <Card>
                    <CardHead><CardTitle>Confirm change — {editing.label}</CardTitle></CardHead>
                    <CardBody>
                        <Field label="New value" error={confirmation.error || undefined}>
                            <Input
                                value={confirmation.rawValue}
                                onChange={(e) => onValueChange(e.target.value)}
                                aria-label="New value"
                            />
                        </Field>
                        <Field label="Effective from">
                            <Input
                                type="datetime-local"
                                value={confirmation.effectiveFrom}
                                onChange={(e) => onEffectiveChange(e.target.value)}
                                aria-label="Effective from"
                            />
                        </Field>
                        <Field label="Reason (required)">
                            <Input
                                value={confirmation.note}
                                onChange={(e) => onNoteChange(e.target.value)}
                                aria-label="Reason"
                                placeholder="Why this change is being made"
                            />
                        </Field>
                        <div className="mt-3 rounded border border-border p-3 text-sm">
                            <div><span className="text-muted-foreground">Selected value: </span>{confirmation.displayValue}</div>
                            <div><span className="text-muted-foreground">Effective from: </span>{confirmation.effectiveFrom || 'immediately'}</div>
                            <div><span className="text-muted-foreground">Reason: </span>{confirmation.note || '—'}</div>
                        </div>
                        {saveError && <p className="mt-2 text-sm text-destructive">{saveError}</p>}
                        <div className="mt-3 flex gap-2">
                            <Button variant="primary" onClick={confirm} disabled={!model.canWrite || !confirmation.valid || saving}>
                                {saving ? 'Saving…' : 'Save change'}
                            </Button>
                            <Button variant="ghost" onClick={() => { setEditing(null); setConfirmation(null); setSaveError(null); }}>
                                Cancel
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )}

            {historyFor && (
                <Card>
                    <CardHead><CardTitle>History — {historyFor}</CardTitle></CardHead>
                    <CardBody>
                        {historyError && <p className="text-sm text-destructive">{historyError}</p>}
                        {historyRows === null && !historyError && <p className="text-sm text-muted-foreground">Loading history…</p>}
                        {historyRows && historyRows.length === 0 && (
                            <p className="text-sm text-muted-foreground">No previous revisions were returned for this setting.</p>
                        )}
                        {historyRows && historyRows.length > 0 && (
                            <ul className="space-y-2 text-sm">
                                {historyRows.map((row, i) => (
                                    <li key={`${row.key}-${i}`} className="border-t border-border pt-2">
                                        <div>{displayValue(row.key, row.value)}</div>
                                        <div className="text-xs text-muted-foreground">
                                            effective {row.effectiveFrom || 'not stated'} · source {row.source || 'not stated'}
                                        </div>
                                        {row.note && <div className="text-xs text-muted-foreground">note: {row.note}</div>}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Button variant="ghost" onClick={() => setHistoryFor(null)}>Close history</Button>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}

export { MONEY_SETTING_META, describeBound, editableState };
