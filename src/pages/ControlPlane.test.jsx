// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ControlPlane from './ControlPlane';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  getControlPlaneSummary: vi.fn(),
  getControlPlaneActivity: vi.fn(),
  refetchSummary: vi.fn(),
  refetchActivity: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('@/lib/controlPlaneApi', () => ({
  getControlPlaneSummary: mocks.getControlPlaneSummary,
  getControlPlaneActivity: mocks.getControlPlaneActivity,
}));

vi.mock('@/components/admin/ReconciliationQueue', () => ({
  default: () => <div data-testid="reconciliation-queue" />,
}));

function arrange({ loading = false } = {}) {
  mocks.useQuery
    .mockImplementationOnce(() => ({
      data: { summary: {} },
      isLoading: loading,
      isError: false,
      refetch: mocks.refetchSummary,
    }))
    .mockImplementationOnce(() => ({
      data: { events: [], pagination: { hasMore: false } },
      isLoading: loading,
      isError: false,
      refetch: mocks.refetchActivity,
    }));
}

describe('ControlPlane refresh control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes an accessible name and prevents duplicate refresh while loading', () => {
    arrange({ loading: true });

    render(<ControlPlane />);

    const refreshButton = screen.getByRole('button', { name: 'Refresh control plane' });
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute('aria-busy', 'true');
    expect(refreshButton).toHaveAttribute('title', 'Refreshing control plane');
  });

  it('refreshes both control-plane queries when idle', () => {
    arrange();

    render(<ControlPlane />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh control plane' }));

    expect(mocks.refetchSummary).toHaveBeenCalledTimes(1);
    expect(mocks.refetchActivity).toHaveBeenCalledTimes(1);
  });
});
