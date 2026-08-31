import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/forge';
import { Input } from '@/components/forge';
import { useState } from 'react';
import {
  Bot, TrendingUp, Gift, Brain, Scale, Handshake, ListOrdered,
  Activity, Zap, RefreshCw, CheckCircle2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import ErrorState from '@/components/ErrorState';

const CAPABILITY_ICONS = {
  'chart-line': Activity,
  'scale-balanced': Scale,
  'handshake': Handshake,
  'list-ol': ListOrdered,
};

export default function AiOps() {
  const qc = useQueryClient();

  const { data: insights, isLoading: loadingInsights, isError: insightsError, refetch: refetchInsights } = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: () => api.aiOps.cfoInsights(),
  });
  const { data: candidates = [], isLoading: loadingCandidates, isError: candidatesError, refetch: refetchCandidates } = useQuery({
    queryKey: ['ai', 'discounts'],
    queryFn: () => api.aiOps.discountCandidates(),
  });

  // CFO analysis trigger
  const cfoMut = useMutation({
    mutationFn: () => fetch(`${import.meta.env.VITE_API_URL || 'https://azm-backend.onrender.com'}/api/ai/cfo/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
      },
    }).then(r => r.json()),
    onSuccess: (data) => {
      toast.success('CFO analysis completed');
      qc.invalidateQueries({ queryKey: ['ai', 'insights'] });
    },
    onError: () => toast.error('CFO analysis failed'),
  });

  const approve = useMutation({
    mutationFn: /** @param {{ userId: string | number, amount: number, duration: number }} data */ ({ userId, amount, duration }) => api.aiOps.approveDiscount(userId, amount, duration),
    onSuccess: () => toast.success('Discount credit approved'),
  });

  const [discountAmounts, setDiscountAmounts] = useState({});

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--f-text)]">AI Operations</h1>
          <p className="text-sm text-ink-2 mt-1">AI-powered insights, anomaly detection, and loyalty tools.</p>
        </div>
        <Button
          onClick={() => cfoMut.mutate()}
          disabled={cfoMut.isPending}
          className="bg-tint hover:bg-[var(--f-tint-color)] text-[var(--f-text)]"
        >
          {cfoMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          Run CFO Analysis
        </Button>
      </div>

      {/* AI Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { id: 'operational-cfo', name: 'Operational CFO', desc: 'AI-powered financial analysis of expenses and balance health.', icon: Bot, status: 'active' },
          { id: 'dispute-assistant', name: 'Dispute Assistant', desc: 'AI-assisted dispute resolution with evidence analysis and fairness scoring.', icon: Scale, status: 'active' },
          { id: 'smart-matchmaking', name: 'Smart Matchmaking', desc: 'AI-sorted ad recommendations based on user preferences and payment methods.', icon: Handshake, status: 'active' },
          { id: 'smart-queue', name: 'Smart Queue', desc: 'Automated trade queue management when ads reach max concurrent capacity.', icon: ListOrdered, status: 'active' },
        ].map(cap => {
          const Icon = cap.icon;
          return (
            <div key={cap.id} className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--f-tint-color)]/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[var(--f-tint-color)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--f-text)]">{cap.name}</p>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--f-ok)] bg-[var(--f-ok-bg)] px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                </div>
                <p className="text-xs text-ink-2 mt-1">{cap.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CFO Insights */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[var(--f-tint-color)]" />
            <h2 className="text-sm font-semibold text-ink-2">CFO Insights</h2>
          </div>
          <button onClick={() => refetchInsights()} className="text-ink-3 hover:text-[var(--f-text)] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loadingInsights && <p className="text-ink-3 text-sm">Generating insights…</p>}
        {insightsError && <ErrorState message="Failed to generate AI insights." onRetry={refetchInsights} compact />}
        {insights && (
          <>
            <p className="text-sm text-ink-2 leading-relaxed">{insights.summary}</p>
            {insights.recommendations?.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide">Recommendations</p>
                {insights.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-ink-2 bg-[var(--f-surface-sunken)] rounded-lg p-2.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[var(--f-ok)] mt-0.5 flex-shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Discount Candidates */}
      <div className="bg-[var(--f-surface-raised)] border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[var(--f-warn)]" />
            <h2 className="text-sm font-semibold text-ink-2">Loyalty Discount Candidates</h2>
          </div>
          <button onClick={() => refetchCandidates()} className="text-ink-3 hover:text-[var(--f-text)] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCandidates ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loadingCandidates && <p className="text-ink-3 text-sm">Loading…</p>}
        {candidatesError && <ErrorState message="Failed to load discount candidates." onRetry={refetchCandidates} compact />}
        {candidates.map((c) => (
          <div key={c.userId} className="flex items-center gap-4 bg-[var(--f-surface-sunken)] rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-[var(--f-warn)]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[var(--f-warn)]">{(c.userName || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--f-text)] truncate">{c.userName}</p>
              <p className="text-xs text-ink-2">{c.tradeCount} trades · {c.reason}</p>
            </div>
            <Input
              type="number"
              placeholder="$"
              className="w-20 bg-line border-line-bright text-[var(--f-text)] text-sm h-8"
              value={discountAmounts[c.userId] || ''}
              onChange={(e) => setDiscountAmounts((d) => ({ ...d, [c.userId]: e.target.value }))}
            />
            <Button
              size="sm"
              onClick={() => approve.mutate({ userId: c.userId, amount: parseFloat(discountAmounts[c.userId]), duration: 30 })}
              disabled={!discountAmounts[c.userId] || approve.isPending}
              className="bg-amber-600 hover:bg-[var(--f-warn)] text-[var(--f-text)] h-8"
            >
              Approve
            </Button>
          </div>
        ))}
        {!loadingCandidates && !candidatesError && candidates.length === 0 && (
          <div className="text-center py-6">
            <Gift className="w-8 h-8 text-ink-3 mx-auto mb-2" />
            <p className="text-ink-3 text-sm">No discount candidates identified yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
