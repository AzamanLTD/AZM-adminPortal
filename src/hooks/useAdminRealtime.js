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
      qc.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
    };

    const invalidateEscrowViews = () => {
      qc.invalidateQueries({ queryKey: ['escrow-disputes'] });
      qc.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dispute-resolutions'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'profit'] });
      qc.invalidateQueries({ queryKey: ['admin', 'health'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
    };

    const invalidateOrderViews = () => {
      // Order/escrow events can change the platform's operational picture even
      // when the admin portal is not viewing a particular order. Invalidate
      // only admin projections; individual business/customer clients remain
      // responsible for their scoped order caches.
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'health'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
    };

    const handleSettlement = (payload) => {
      if (!payload?.reference) return;
      invalidateFinancialViews();
    };

    const handleAdminAlert = (payload) => {
      if (!payload?.type) return;
      if ([
        'WITHDRAWAL_SETTLED',
        'WITHDRAWAL_FAILED',
        'LIQUIDITY_LOW',
        'PROFIT_LIQUIDATION',
      ].includes(payload.type)) {
        invalidateFinancialViews();
      }
    };

    const handleReconciliationException = (payload) => {
      if (!payload?.id) return;
      qc.invalidateQueries({ queryKey: ['control-plane', 'reconciliation'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
    };

    const handleEscrowEvent = (payload) => {
      // Escrow events are convergence signals. Do not patch cached financial
      // values from socket payloads; refetch the authoritative admin APIs.
      if (!payload || typeof payload !== 'object') return;
      invalidateEscrowViews();
    };

    const handleOrderEvent = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      invalidateOrderViews();
    };

    const handleBalanceUpdate = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      invalidateFinancialViews();
    };

    const escrowEvents = [
      'escrow_funded',
      'escrow_settled',
      'escrow_pending_settlement',
      'escrow_disputed',
      'escrow_resolved',
      'escrow_terms_updated',
      'escrow_refunded',
      'invoice_paid',
    ];
    const orderEvents = [
      'order:location',
      'order:status',
      'order:eta',
      'order_location',
      'order_status',
      'order_eta',
      'business_order_delivered',
    ];

    socket.on('withdrawal_settled', handleSettlement);
    socket.on('admin_alert', handleAdminAlert);
    socket.on('reconciliation_exception', handleReconciliationException);
    socket.on('balance_update', handleBalanceUpdate);

    escrowEvents.forEach((event) => socket.on(event, handleEscrowEvent));
    orderEvents.forEach((event) => socket.on(event, handleOrderEvent));

    return () => {
      socket.off('withdrawal_settled', handleSettlement);
      socket.off('admin_alert', handleAdminAlert);
      socket.off('reconciliation_exception', handleReconciliationException);
      socket.off('balance_update', handleBalanceUpdate);

      escrowEvents.forEach((event) => socket.off(event, handleEscrowEvent));
      orderEvents.forEach((event) => socket.off(event, handleOrderEvent));
    };
  }, [qc, socket]);
}
