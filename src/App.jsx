import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ForgeLayout } from '@/components/forge/ForgeLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import { Toaster } from 'sonner';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Profits = lazy(() => import('@/pages/Profits'));
const Pools = lazy(() => import('@/pages/Pools'));
const FeeEngine = lazy(() => import('@/pages/FeeEngine'));
const FeeProfiles = lazy(() => import('@/pages/FeeProfiles'));
const SmartEscrowPolicy = lazy(() => import('@/pages/SmartEscrowPolicy'));
const WarRoom = lazy(() => import('@/pages/WarRoom'));
const Users = lazy(() => import('@/pages/Users'));
const Withdrawals = lazy(() => import('@/pages/Withdrawals'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));
const Config = lazy(() => import('@/pages/Config'));
const AiOps = lazy(() => import('@/pages/AiOps'));
const QrForge = lazy(() => import('@/pages/QrForge'));
const SusuGroups = lazy(() => import('@/pages/SusuGroups'));
const SusuIncidents = lazy(() => import('@/pages/SusuIncidents'));
const ResidencyQueue = lazy(() => import('@/pages/ResidencyQueue'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const BusinessKYB = lazy(() => import('@/pages/BusinessKYB'));
const EscrowDisputes = lazy(() => import('@/pages/EscrowDisputes'));
const Businesses = lazy(() => import('@/pages/Businesses'));
const Storefronts = lazy(() => import('@/pages/Storefronts'));
const BusinessDetail = lazy(() => import('@/pages/BusinessDetail'));

function RouteLoader() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-7 w-48 rounded-md bg-surface-sunken animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-surface-sunken animate-pulse" />)}
      </div>
      <div className="h-64 rounded-lg bg-surface-sunken animate-pulse" />
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, authError } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="h-8 w-8 rounded-md bg-surface-sunken animate-pulse mx-auto" />
          <p className="text-sm text-ink-3 mt-4">Verifying credentials</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  }

  const page = (Component) => <ErrorBoundary><Suspense fallback={<RouteLoader />}><Component /></Suspense></ErrorBoundary>;

  return (
    <Routes>
      <Route element={<ForgeLayout />}>
        <Route path="/" element={page(Dashboard)} />
        <Route path="/profits" element={page(Profits)} />
        <Route path="/pools" element={page(Pools)} />
        <Route path="/fee-engine" element={page(FeeEngine)} />
        <Route path="/fee-profiles" element={page(FeeProfiles)} />
        <Route path="/smart-escrow" element={page(SmartEscrowPolicy)} />
        <Route path="/war-room" element={page(WarRoom)} />
        <Route path="/escrow-disputes" element={page(EscrowDisputes)} />
        <Route path="/susu" element={page(SusuGroups)} />
        <Route path="/susu-incidents" element={page(SusuIncidents)} />
        <Route path="/residency-queue" element={page(ResidencyQueue)} />
        <Route path="/business-kyb" element={page(BusinessKYB)} />
        <Route path="/storefronts" element={page(Storefronts)} />
        <Route path="/businesses" element={page(Businesses)} />
        <Route path="/businesses/:bizId" element={page(BusinessDetail)} />
        <Route path="/notifications" element={page(Notifications)} />
        <Route path="/users" element={page(Users)} />
        <Route path="/withdrawals" element={page(Withdrawals)} />
        <Route path="/audit-log" element={page(AuditLog)} />
        <Route path="/config" element={page(Config)} />
        <Route path="/ai-ops" element={page(AiOps)} />
        <Route path="/qr-forge" element={page(QrForge)} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster
          position="top-center"
          theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
          toastOptions={{ className: 'sentry-toast', style: { background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)', color: 'var(--f-text)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(17,17,17,0.08)' } }}
        />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
