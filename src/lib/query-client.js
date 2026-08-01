import { QueryClient, keepPreviousData } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => err?.status >= 500 && count < 2,
      placeholderData: keepPreviousData,
    },
    mutations: { retry: 0 },
  },
});
export { queryClientInstance as queryClient };
