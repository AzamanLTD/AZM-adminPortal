import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAdminSocket } from '@/lib/adminSocket';

/**
 * Global admin realtime reconciliation boundary.
 *
 * The backend remains authoritative. Socket events are invalidation signals,
 * never a second source of financial truth. A settlement event therefore
 * refreshes the admin queues/statistics rather than patching financial values
 * directly into React Query caches.
 */
export function useAdminRealtime() {
  const qc = useQueryClient();
  const socket = getAdminSocket();

  useEffect(() => {
    if (!socket) return undefined;

    const invalidateFinancialViews = () => {
      qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'profit'] });
      qc.invalidateQueries({ queryKey: ['admin', 'health'] });
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    };

    const handleSettlement = (payload) => {
      if (!payload?.reference) return;
      invalidateFinancialViews();
    };

    const handleAdminAlert = (payload) => {
      if (!payload?.type) return;
      if (['WITHDRAWAL_SETTLED', 'WITHDRAWAL_FAILED', 'LIQUIDITY_LOW', 'PROFIT_LIQUIDATION'].includes(payload.type)) {
        invalidateFinancialViews();
      }
    };

    socket.on('withdrawal_settled', handleSettlement);
    socket.on('admin_alert', handleAdminAlert);

    return () => {
      socket.off('withdrawal_settled', handleSettlement);
      socket.off('admin_alert', handleAdminAlert);
    };
  }, [qc, socket]);
}
