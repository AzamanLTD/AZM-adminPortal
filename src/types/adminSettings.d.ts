/**
 * Authoritative compile-time settings boundary for checked Admin Portal source.
 * Runtime validation remains in src/lib/settingsContracts.js.
 * Keep this boundary independent from the excluded src/lib implementation graph.
 */
export interface AdminSettings {
  p2pFeePct: number;
  bankMargin: number;
  thirdPartyMargin: number;
  vendorShareUnder1k: number;
  vendorShareOver1k: number;
  tierThreshold: number;
  vendorMinCollateral: number;
  baseExitFeePct: number;
  fiatWithdrawalFeePct: number;
  cryptoWithdrawalFeePct: number;
  cryptoPlatformFeePct: number;
  withdrawalFeeByRiskTier: Record<string, number>;
  feeByPaymentMethod: Record<string, number>;
  supportedPaymentMethods: string[];
  gasFeeTrc20: number;
  gasFeeErc20: number;
  gasFeeBep20: number;
  autoPayoutEnabled: boolean;
  autoPayoutThresholdUsdc: number;
  autoPayoutMaxAmountUsdc: number;
  autoPayoutIntervalMs: number;
  liveUsdToGhs: number;
  liveRetailRate?: number | null;
  liveCorporateRate?: number | null;
  liveRateSource: string;
  lastRateSync?: string | null;
  minAppVersion: string;
  forceUpdateUrl: string;
  updateMessage: string;
  susuProfitPct: number;
  smartEscrowFeePct: number;
  escrowDraftExpiryHours: number;
  escrowFundedExpiryDays: number;
  [key: string]: unknown;
}

export interface AdminSettingsResponse {
  success: true;
  settings: AdminSettings;
  [key: string]: unknown;
}

export interface AdminSettingsUpdate {
  p2pFeePct?: number;
  bankMargin?: number;
  thirdPartyMargin?: number;
  vendorShareUnder1k?: number;
  vendorShareOver1k?: number;
  tierThreshold?: number;
  vendorMinCollateral?: number;
  baseExitFeePct?: number;
  fiatWithdrawalFeePct?: number;
  cryptoWithdrawalFeePct?: number;
  cryptoPlatformFeePct?: number;
  withdrawalFeeByRiskTier?: Record<string, number>;
  feeByPaymentMethod?: Record<string, number>;
  supportedPaymentMethods?: string[];
  gasFeeTrc20?: number;
  gasFeeErc20?: number;
  gasFeeBep20?: number;
  autoPayoutEnabled?: boolean;
  autoPayoutThresholdUsdc?: number;
  autoPayoutMaxAmountUsdc?: number;
  autoPayoutIntervalMs?: number;
  liveUsdToGhs?: number;
  liveRetailRate?: number;
  liveCorporateRate?: number;
  liveRateSource?: string;
  lastRateSync?: string | null;
  minAppVersion?: string;
  forceUpdateUrl?: string;
  updateMessage?: string;
  susuProfitPct?: number;
  smartEscrowFeePct?: number;
  escrowDraftExpiryHours?: number;
  escrowFundedExpiryDays?: number;
}
