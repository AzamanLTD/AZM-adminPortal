import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Bot, TrendingUp, Gift } from 'lucide-react';
import { toast } from 'sonner';
import ErrorState from '@/components/ErrorState';

export default function AiOps() {
  const { data: insights, isLoading: loadingInsights, isError: insightsError, refetch: refetchInsights } = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: () => api.aiOps.cfoInsights(),
  });
  const { data: candidates = [], isLoading: loadingCandidates, isError: candidatesError, refetch: refetchCandidates } = useQuery({
    queryKey: ['ai', 'discounts'],
    queryFn: () => api.aiOps.discountCandidates(),
  });

  const approve = useMutation({
    mutationFn: ({ userId, amount, duration }) => api.aiOps.approveDiscount(userId, amount, duration),
    onSuccess: () => toast.success('Discount credit approved'),
  });

  const [discountAmounts, setDiscountAmounts] = useState({});

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">AI Operations</h1>
        <p className="text-sm text-az-text-secondary mt-1">AI-powered insights and loyalty tools.</p>
      </div>

      {/* CFO Insights */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-az-text-secondary">CFO Insights</h2>
        </div>
        {loadingInsights && <p className="text-az-text-muted text-sm">Generating insights…</p>}
        {insightsError && <ErrorState message="Failed to generate AI insights." onRetry={refetchInsights} compact />}
        {insights && (
          <>
            <p className="text-sm text-az-text-secondary leading-relaxed">{insights.summary}</p>
            {insights.recommendations?.length > 0 && (
              <ul className="space-y-2 mt-3">
                {insights.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-az-text-secondary">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Discount Candidates */}
      <div className="bg-az-surface border border-az-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-az-text-secondary">Loyalty Discount Candidates</h2>
        </div>
        {loadingCandidates && <p className="text-az-text-muted text-sm">Loading…</p>}
        {candidatesError && <ErrorState message="Failed to load discount candidates." onRetry={refetchCandidates} compact />}
        {candidates.map((c) => (
          <div key={c.userId} className="flex items-center gap-4 bg-az-card rounded-xl p-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{c.userName}</p>
              <p className="text-xs text-az-text-secondary">{c.tradeCount} trades · ${c.totalVolume} volume · {c.reason}</p>
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
              disabled={!discountAmounts[c.userId]}
              className="bg-amber-600 hover:bg-amber-500 text-white h-8"
            >
              Approve
            </Button>
          </div>
        ))}
        {!loadingCandidates && candidates.length === 0 && (
          <p className="text-az-text-muted text-sm text-center py-4">No discount candidates identified yet.</p>
        )}
      </div>
    </div>
  );
}