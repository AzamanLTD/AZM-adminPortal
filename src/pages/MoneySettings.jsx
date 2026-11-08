import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button, Card, CardBody, CardHead, CardTitle, Field, Input, Tag } from '@/components/forge';
import { toast } from 'sonner';
import { History, Loader2, Lock, RefreshCw, ShieldAlert } from 'lucide-react';
import {
    buildConfirmation,
    buildMoneySettingsModel,
    validateSettingValue,
} from '@/lib/moneySettingsContract';
import { resolveMoneySettingsGateway } from '@/lib/moneySettingsGateway';

/**
 * Money Settings (directive 1-E).
 *
 * Read-only by default and explicitly gated: the screen renders editable
 * controls only when the session carries `money.settings.write`. Rollout flags
 * are display-only — this file contains no flag writer, and the contract module
 * exposes none (`flagWritesAllowed: false`).
 *
 * No value is ever invented: if the gateway cannot answer, the screen says so
 * and offers a retry instead of showing defaults.
 */
export default function MoneySettings({ gateway: injectedGateway = null }) {
    const { user } = useAuth();
    const gateway = useMemo(() => {
        if (injectedGateway) return injectedGateway;
        const mode = import.meta.env?.VITE_MONEY_SETTINGS_MODE === 'live' ? 'live' : 'mock';
        try {
            return resolveMoneySettingsGateway({
                mode,
                http: null,
                mockOptions: { unavailable: mode === 'mock' },
            });
        } catch {
            return null;
        }
    }, [injectedGateway]);

    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [draftValue, setDraftValue] = useState('');
    const [effectiveAt, setEffectiveAt] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [historyFor, setHistoryFor] = useState(null);
    const [historyRows, setHistoryRows] = useState([]);
    const [saveError, setSaveError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!gateway) throw new Error('No gateway configured.');
            setSnapshot(await gateway.get());
        } catch (e) {
            setSnapshot(null);
            setError(e?.message || 'Money settings are unavailable.');
        } finally {
            setLoading(false);
        }
    }, [gateway]);

    useEffect(() => { load(); }, [load]);

    const model = buildMoneySettingsModel({
        admin: user,
        snapshot,
        error,
        gatewayMode: gateway?.mode || 'live',
    });

    const openHistory = async (key) => {
        setHistoryFor(key);
        setHistoryRows([]);
        try {
            setHistoryRows(await gateway.history(key));
        } catch (e) {
            setHistoryRows([]);
            toast.error(e?.message || 'Could not load history');
        }
    };

    const beginEdit = (row) => {
        setEditing(row.key);
        setDraftValue(row.value == null ? '' : String(row.value));
        setEffectiveAt('');
        setConfirming(false);
        setSaveError(null);
    };

    const confirmation = editing ? buildConfirmation(editing, draftValue, effectiveAt) : null;

    const save = async () => {
        if (!confirmation?.valid || !effectiveAt) return;
        setSaving(true);
        setSaveError(null);
        try {
            const validated = validateSettingValue(editing, draftValue);
            await gateway.update(editing, validated.value, effectiveAt);
            toast.success(`${confirmation.label} saved`);
            setEditing(null);
            setConfirming(false);
            await load();
        } catch (e) {
            setSaveError(e?.message || 'The save failed. Nothing was changed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-content">Money settings</h1>
                    <p className="text-sm text-content-muted">
                        Quote lifetimes, FX spreads and the step-up threshold. GHS values are exact decimals;
                        the portal never validates authoritative money with floating-point maths.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Tag>{model.gatewayMode === 'mock' ? 'mock gateway' : 'live gateway'}</Tag>
                    {!model.canWrite && (
                        <Tag tone="warn" data-testid="money-settings-readonly">
                            <Lock className="h-3 w-3" /> read-only
                        </Tag>
                    )}
                    <Button variant="ghost" onClick={load} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>
            </header>

            {model.unavailable && (
                <Card>
                    <CardBody>
                        <div className="flex items-start gap-3" data-testid="money-settings-unavailable">
                            <ShieldAlert className="mt-0.5 h-4 w-4 text-warn" />
                            <div>
                                <p className="text-sm font-medium text-content">Money settings are unavailable</p>
                                <p className="text-sm text-content-muted">{model.unavailableReason}</p>
                                <p className="mt-1 text-xs text-content-muted">
                                    No defaults are shown, because a made-up value here would be a made-up money rule.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            {!model.unavailable && !model.canWrite && (
                <Card>
                    <CardBody>
                        <p className="text-sm text-content-muted">
                            Your session carries no <code>money.settings.write</code> permission, so every value is
                            read-only. Ask for the permission rather than editing through another route.
                        </p>
                    </CardBody>
                </Card>
            )}

            {!model.unavailable && model.groups.map((group) => (
                <Card key={group.group}>
                    <CardHead><CardTitle>{group.group}</CardTitle></CardHead>
                    <CardBody>
                        <div className="divide-y divide-border">
                            {group.rows.map((row) => (
                                <div key={row.key} className="flex flex-wrap items-start justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-content">{row.label}</p>
                                        <p className="text-xs text-content-muted">{row.description}</p>
                                        {row.bound && <p className="mt-1 text-xs text-content-muted">Bounds: {row.bound}</p>}
                                        {row.pendingNote && (
                                            <p className="mt-1 text-xs text-warn" data-testid={`pending-${row.key}`}>
                                                {row.pendingNote}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-content">
                                            {row.value == null ? '—' : String(row.value)}
                                        </span>
                                        <Button variant="ghost" onClick={() => openHistory(row.key)} title="History">
                                            <History className="h-4 w-4" />
                                        </Button>
                                        {row.editable && (
                                            <Button onClick={() => beginEdit(row)}>Edit</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            ))}

            <Card>
                <CardHead>
                    <CardTitle>Rollout flags</CardTitle>
                </CardHead>
                <CardBody>
                    <p className="text-xs text-content-muted">
                        Informational only. These flags change accounting and rollout behaviour and are not
                        editable from the admin portal.
                    </p>
                    <div className="mt-3 divide-y divide-border">
                        {model.flags.map((flag) => (
                            <div key={flag.key} className="py-3" data-testid={`flag-${flag.key}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-content">{flag.label}</p>
                                    <Tag tone={flag.value ? 'success' : 'neutral'}>
                                        {flag.value == null ? 'unknown' : flag.value ? 'on' : 'off'}
                                    </Tag>
                                </div>
                                <p className="text-xs text-content-muted">{flag.explanation}</p>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {historyFor && (
                <Card>
                    <CardHead>
                        <CardTitle>History — {historyFor}</CardTitle>
                        <Button variant="ghost" onClick={() => setHistoryFor(null)}>Close</Button>
                    </CardHead>
                    <CardBody>
                        {historyRows.length === 0 ? (
                            <p className="text-sm text-content-muted">No revisions recorded for this setting.</p>
                        ) : (
                            <ul className="space-y-2">
                                {historyRows.map((rev, index) => (
                                    <li key={`${rev.revision ?? index}`} className="text-sm text-content">
                                        <span className="font-mono">{String(rev.from ?? '—')} → {String(rev.to ?? '—')}</span>
                                        {' · '}
                                        <span className="text-content-muted">
                                            effective {rev.effectiveAt || 'unspecified'} · {rev.actor || 'unknown actor'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            )}

            {editing && confirmation && (
                <Card>
                    <CardHead><CardTitle>Change {confirmation.label}</CardTitle></CardHead>
                    <CardBody>
                        <div className="space-y-3">
                            <Field label="New value" error={confirmation.error || undefined}>
                                <Input
                                    value={draftValue}
                                    onChange={(e) => { setDraftValue(e.target.value); setConfirming(false); }}
                                />
                            </Field>
                            <Field label="Effective at">
                                <Input
                                    type="datetime-local"
                                    value={effectiveAt}
                                    onChange={(e) => { setEffectiveAt(e.target.value); setConfirming(false); }}
                                />
                            </Field>

                            {confirming ? (
                                <div className="rounded-md border border-border p-3" data-testid="money-settings-confirmation">
                                    <p className="text-sm text-content">
                                        Apply <strong>{confirmation.displayValue}</strong> effective{' '}
                                        <strong>{effectiveAt || 'unspecified'}</strong>?
                                    </p>
                                    {saveError && <p className="mt-1 text-xs text-danger">{saveError}</p>}
                                    <div className="mt-2 flex gap-2">
                                        <Button onClick={save} disabled={saving || !effectiveAt || !confirmation.valid}>
                                            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirm and save
                                        </Button>
                                        <Button variant="ghost" onClick={() => setConfirming(false)}>Back</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => setConfirming(true)}
                                        disabled={!confirmation.valid || !effectiveAt}
                                    >
                                        Review change
                                    </Button>
                                    <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                                    {!confirmation.valid && confirmation.error && (
                                        <span className="text-xs text-danger" data-testid="money-settings-invalid">
                                            {confirmation.error}
                                        </span>
                                    )}
                                    {confirmation.valid && !effectiveAt && (
                                        <span className="text-xs text-content-muted">Choose when this takes effect.</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
