import '@tanstack/react-query';

/**
 * Error envelope used by the Admin API transport and the financial facade.
 * The transport always throws an Error instance, while attaching these
 * optional server-provided fields when they are available.
 */
export interface AdminApiError extends Error {
  statusCode?: number;
  violations?: unknown;
  tier?: unknown;
  stakedBalance?: unknown;
  code?: string;
  data?: {
    code?: string;
    message?: string;
    [key: string]: unknown;
  };
  response?: {
    data?: {
      code?: string;
      message?: string;
      [key: string]: unknown;
    };
    status?: number;
    [key: string]: unknown;
  };
}

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AdminApiError;
  }
}
