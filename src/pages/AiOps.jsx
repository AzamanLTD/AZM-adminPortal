import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    mutationFn: ({ userId, amount, duration }) => api.aiOps.approveDiscount(userId, amount, duration),
    onSuccess: () => toast.success('Discount credit approved'),
  });

  const [discountAmounts, setDiscountAmounts] = useState({});

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI Operations</h1>
          <p className="text-sm text-az-text-secondary mt-1">AI-powered insights, anomaly detection, and loyalty tools.</p>
        </div>
        <Button
          onClick={() => cfoMut.mutate()}
          disabled={cfoMut.isPending}
          className="bg-purple-600 hover:bg-purple-500 text-white"
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
            <div key={cap.id} className="bg-az-surface border border-az-border rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{cap.name}</p>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                </div>
                <p className="text-xs text-az-text-secondary mt-1">{cap.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CFO Insights */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-az-text-secondary">CFO Insights</h2>
          </div>
          <button onClick={() => refetchInsights()} className="text-az-text-muted hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loadingInsights && <p className="text-az-text-muted text-sm">Generating insights…</p>}
        {insightsError && <ErrorState message="Failed to generate AI insights." onRetry={refetchInsights} compact />}
        {insights && (
          <>
            <p className="text-sm text-az-text-secondary leading-relaxed">{insights.summary}</p>
            {insights.recommendations?.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-semibold text-az-text-muted uppercase tracking-wide">Recommendations</p>
                {insights.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-az-text-secondary bg-az-card rounded-lg p-2.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Discount Candidates */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-az-text-secondary">Loyalty Discount Candidates</h2>
          </div>
          <button onClick={() => refetchCandidates()} className="text-az-text-muted hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCandidates ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loadingCandidates && <p className="text-az-text-muted text-sm">Loading…</p>}
        {candidatesError && <ErrorState message="Failed to load discount candidates." onRetry={refetchCandidates} compact />}
        {candidates.map((c) => (
          <div key={c.userId} className="flex items-center gap-4 bg-az-card rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-amber-400">{(c.userName || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{c.userName}</p>
              <p className="text-xs text-az-text-secondary">{c.tradeCount} trades · {c.reason}</p>
            </div>
            <Input
              type="number"
              placeholder="$"
              className="w-20 bg-az-border border-az-border-bright text-white text-sm h-8"
              value={discountAmounts[c.userId] || ''}
              onChange={(e) => setDiscountAmounts((d) => ({ ...d, [c.userId]: e.target.value }))}
            />
            <Button
              size="sm"
              onClick={() => approve.mutate({ userId: c.userId, amount: parseFloat(discountAmounts[c.userId]), duration: 30 })}
              disabled={!discountAmounts[c.userId] || approve.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-white h-8"
            >
              Approve
            </Button>
          </div>
        ))}
        {!loadingCandidates && !candidatesError && candidates.length === 0 && (
          <div className="text-center py-6">
            <Gift className="w-8 h-8 text-az-text-muted mx-auto mb-2" />
            <p className="text-az-text-muted text-sm">No discount candidates identified yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
