import { cn } from '@/lib/utils';

/**
 * THE canonical status vocabulary. Adding a status means editing this map,
 * not writing a new colour object in a page file.
 */
export const STATUS = {
  // lifecycle
  DRAFT:      ['neutral','Draft'],
  PENDING:    ['warn','Pending'],
  IN_REVIEW:  ['info','In review'],
  ACTIVE:     ['ok','Active'],
  COMPLETED:  ['ok','Completed'],
  CANCELLED:  ['neutral','Cancelled'],
  FAILED:     ['bad','Failed'],
  SUSPENDED:  ['bad','Suspended'],
  // compliance
  UNVERIFIED: ['neutral','Unverified'],
  SUBMITTED:  ['info','Submitted'],
  VERIFIED:   ['ok','Verified'],
  REJECTED:   ['bad','Rejected'],
  EXPIRED:    ['warn','Expired'],
  // money
  UNPAID:     ['warn','Unpaid'],
  PART_PAID:  ['warn','Part paid'],
  PAID:       ['ok','Paid'],
  REFUNDED:   ['neutral','Refunded'],
  CHARGEBACK: ['bad','Chargeback'],
  HELD:       ['info','In escrow'],
  // ops
  UNASSIGNED: ['warn','Unassigned'],
  READY:      ['ok','Ready'],
  OCCUPIED:   ['info','Occupied'],
  DIRTY:      ['warn','Needs cleaning'],
  OUT_OF_ORDER:['bad','Out of order'],
  BOARDING:   ['info','Boarding'],
  DEPARTED:   ['neutral','Departed'],
  DELAYED:    ['bad','Delayed'],
  // risk
  LOW:['ok','Low risk'], MEDIUM:['warn','Medium risk'], HIGH:['bad','High risk'],
};

export function Tag({ status, tone, children, dot = true, className }) {
  const [t, label] = STATUS[status] ?? [tone ?? 'neutral', children ?? status];
  return (
    <span className={cn('f-tag', `f-tag--${tone ?? t}`, className)}>
      {dot && <i aria-hidden />}
      {children ?? label}
    </span>
  );
}
