import { useQuery } from '@tanstack/react-query';
import { financialApi } from './financialApi';

export function useFinancialFeeProfiles() {
  return useQuery({
    queryKey: ['admin', 'fee-profiles'],
    queryFn: async () => {
      const response = await financialApi.fees.list();
      return response.profiles;
    },
  });
}
