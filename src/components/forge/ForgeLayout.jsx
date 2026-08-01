import { Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { Shell, CommandPalette, TooltipProvider, ToastProvider as ForgeToast } from '@/components/forge';
import { CommandProvider } from '@/lib/command';
import { ThemeProvider } from '@/lib/theme';
import { useStats } from '@/lib/useAdminData';
import { useAdminNotifications } from '@/lib/useAdminNotifications';

export function ForgeLayout() {
  const { data: stats = {} } = useStats();

  const navProps = useMemo(() => ({
    counts: {
      disputes:        stats.activeDisputes    || 0,
      escrow_disputes: stats.disputedEscrows   || 0,
      kyc:             stats.pendingKyc        || 0,
      withdrawals:     stats.pendingWithdrawals || 0,
      biz_kyb:         stats.pendingBusinessKyb || 0,
    },
  }), [stats]);

  return (
    <ThemeProvider>
      <CommandProvider>
        <TooltipProvider>
          <ForgeToast>
            <Shell navProps={navProps} brandName="Azaman Admin" brandShort="AZ">
              <Outlet />
            </Shell>
            <CommandPalette navProps={navProps} />
          </ForgeToast>
        </TooltipProvider>
      </CommandProvider>
    </ThemeProvider>
  );
}
