import { cn } from '@/lib/utils';

export function Card({ className, children, raised, flush, ...props }) {
  return (
    <div className={cn('f-card', raised && 'f-card--raised', flush && 'f-card--flush', className)}
         {...props}>
      {children}
    </div>
  );
}

export function CardHead({ className, children, ...props }) {
  return <div className={cn('f-card__head', className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return <div className={cn('f-card__title', className)}>{children}</div>;
}

export function CardBody({ className, children, ...props }) {
  return <div className={cn('f-card__body', className)} {...props}>{children}</div>;
}
