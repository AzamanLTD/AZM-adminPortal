import { useQuery } from '@tanstack/react-query';
import { financialApi } from './financialApi';

/**
 * @typedef {Object} FeeProfile
 * @property {string|number} id
 * @property {string} name
 * @property {string} targetScope
 * @property {string|null|undefined} targetValue
 * @property {number} platformFeePct
 * @property {number} adminSplitPct
 * @property {number} vendorSplitPct
 * @property {number} exitFeePct
 * @property {number} priority
 * @property {string|null|undefined} validFrom
 * @property {string|null|undefined} validUntil
 * @property {boolean} isActive
 */

export function useFinancialFeeProfiles() {
  return useQuery({
    queryKey: ['admin', 'fee-profiles'],
    /** @returns {Promise<FeeProfile[]>} */
    queryFn: async () => {
      const response = await financialApi.fees.list();
      return response.profiles;
    },
  });
}
