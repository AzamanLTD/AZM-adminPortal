import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { financialApi } from '@/lib/financialApi';
import { Button } from '@/components/forge';
import { Input } from '@/components/forge';
import { toast } from 'sonner';
import { Smartphone, Zap, Bot, DollarSign, Shield, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

/** @typedef {import('@/types/adminSettings').AdminSettings} AdminSettings */

export default function Config() {
  const qc = useQueryClient();

  const { data: vg, isError: vgError, refetch: refetchVg } = useQuery({ queryKey: ['version-gate'], queryFn: () => api.versionGate.get().catch(() => ({ minVersion: '1.0.0', updateUrl: '', message: '', _error: true })) });
  const { data: po, isError: poError, refetch: refetchPo } = useQuery({ queryKey: ['payout-settings'], queryFn: () => financialApi.payouts.settings().catch(() => ({ settings: { autoPayoutThresholdUsdc: 100, autoPayoutMaxAmountUsdc: 1000, autoPayoutIntervalMs: 86400000, autoPayoutEnabled: true }, pool: { balance: 0, alertThreshold: 0 }, _error: true })) });
  const { data: gs, isError: gsError, refetch: refetchGs } = useQuery({
    queryKey: ['global-settings'],
    /** @returns {Promise<{ settings: Pick<AdminSettings, 'susuProfitPct' | 'liveUsdToGhs' | 'liveRateSource' | 'lastRateSync'>, _error?: boolean }>} */
    queryFn: () => financialApi.settings.get().catch(() => ({ settings: { susuProfitPct: 0.03, liveUsdToGhs: 15.2, liveRateSource: 'AZM_ADMIN_MOCK', lastRateSync: null }, _error: true })),
  });

  const hasAnyError = vgError || poError || gsError;

  const [vgForm, setVgForm] = useState({});
  const [poForm, setPoForm] = useState({});
  const [gsForm, setGsForm] = useState({});

  // 2FA state
  const { data: twoFAStatus, refetch: refetch2FA } = useQuery({ queryKey: ['2fa', 'status'], queryFn: () => api.twoFactor.status().catch(() => ({ enabled: false, hasSecret: false })) });