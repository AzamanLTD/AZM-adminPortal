import { Outlet, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Shell, CommandPalette, TooltipProvider } from '@/components/forge';
import { CommandProvider } from '@/lib/command';
import { ThemeProvider } from '@/lib/theme';
import { useStats } from '@/lib/useAdminData';
import { useAuth } from '@/lib/AuthContext';
import SystemStatusRail from '@/components/forge/SystemStatusRail';

export function ForgeLayout() {
  const { data: stats = {} } = useStats();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navProps = useMemo(() => ({
    counts: {
      disputes: stats.activeDisputes || 0,
      escrow_disputes: stats.disputedEscrows || 0,
      kyc: stats.pendingKyc || 0,
      withdrawals: stats.pendingWithdrawals || 0,
      biz_kyb: stats.pendingBusinessKyb || 0,
    },
  }), [stats]);

  const adminRoot = useMemo(() => ({ 'data-vertical': 'general' }), []);

  return (
    <ThemeProvider>
      <div {...adminRoot}>
        <CommandProvider>
          <TooltipProvider>
            <Shell
              navProps={navProps}
              brandName="Azaman Admin"
              brandShort="AZ"
              user={user}
              onLogout={logout}
              onNavigateSettings={() => navigate('/config')}
            >
              <SystemStatusRail />
              <Outlet />
            </Shell>
            <CommandPalette navProps={navProps} />
          </TooltipProvider>
        </CommandProvider>
      </div>
    </ThemeProvider>
  );
}
