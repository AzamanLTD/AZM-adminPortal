import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAdminSocket } from '@/lib/adminSocket';

/**
 * Global admin realtime reconciliation boundary.
 * Backend/domain state remains authoritative. Socket events only invalidate
 * projections so every consumer refetches the canonical server state.
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
      if (['WITHDRAWAL_SETTLED', 'WITHDRAWAL_FAILED', 'LIQUIDITY_LOW', 'PROFIT_LIQUIDATION'].includes(payload.type)) invalidateFinancialViews();
    };

    const handleReconciliationException = (payload) => {
      if (!payload?.id) return;
      qc.invalidateQueries({ queryKey: ['control-plane', 'reconciliation'] });
    };

    socket.on('withdrawal_settled', handleSettlement);
    socket.on('admin_alert', handleAdminAlert);
    socket.on('reconciliation_exception', handleReconciliationException);

    return () => {
      socket.off('withdrawal_settled', handleSettlement);
      socket.off('admin_alert', handleAdminAlert);
      socket.off('reconciliation_exception', handleReconciliationException);
    };
  }, [qc, socket]);
}
