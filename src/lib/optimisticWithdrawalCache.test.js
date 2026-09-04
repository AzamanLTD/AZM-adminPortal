import { describe, expect, it } from 'vitest';
import { captureWithdrawal, patchWithdrawal, rollbackWithdrawal } from './optimisticWithdrawalCache';

describe('optimistic withdrawal cache', () => {
  const first = { id: 'w1', status: 'PENDING', amount: 100 };
  const second = { id: 'w2', status: 'PENDING', amount: 200 };

  it('preserves array metadata while applying an optimistic status', () => {
    const source = Object.assign([first, second], {
      frozen: [{ id: 'f1' }],
      counts: { pending: 2 },
      pagination: { page: 1, total: 2 },
    });

    const next = patchWithdrawal(source, 'w1', 'approved');

    expect(next[0]).toEqual({ ...first, status: 'approved' });
    expect(next[1]).toEqual(second);
    expect(next.frozen).toBe(source.frozen);
    expect(next.counts).toBe(source.counts);
    expect(next.pagination).toBe(source.pagination);
  });

  it('rolls back only a failed optimistic item', () => {
    const source = Object.assign([
      { ...first, status: 'approved' },
      second,
    ], {
      counts: { pending: 1 },
    });

    const next = rollbackWithdrawal(source, 'w1', first, 'approved');

    expect(next[0]).toEqual(first);
    expect(next[1]).toEqual(second);
    expect(next.counts).toBe(source.counts);
  });

  it('does not overwrite a newer server or realtime state during rollback', () => {
    const current = Object.assign([
      { ...first, status: 'PENDING', updatedAt: 'newer' },
      second,
    ], { counts: { pending: 2 } });

    const next = rollbackWithdrawal(current, 'w1', first, 'approved');

    expect(next).toBe(current);
    expect(next[0]).toEqual({ ...first, status: 'PENDING', updatedAt: 'newer' });
  });

  it('captures the exact prior item for a targeted rollback', () => {
    const source = [first, second];

    expect(captureWithdrawal(source, 'w2')).toBe(second);
    expect(captureWithdrawal(source, 'missing')).toBeNull();
  });
});
