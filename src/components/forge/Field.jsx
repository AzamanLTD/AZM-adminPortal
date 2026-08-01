import { useId } from 'react';
import { cn } from '@/lib/utils';

export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  const child = typeof children === 'function' ? children({ id, invalid: !!error }) : children;
  return (
    <div className={cn('f-field', className)}>
      {label && (
        <label htmlFor={id}>
          {label}{required && <span className="text-bad ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {child}
      {error ? <span className="f-field__err" role="alert">{error}</span>
             : hint && <span className="f-field__hint">{hint}</span>}
    </div>
  );
}

export const Input = ({ className, invalid, ...p }) =>
  <input className={cn('f-input', className)} aria-invalid={invalid || undefined} {...p} />;

export const Textarea = ({ className, rows = 4, ...p }) =>
  <textarea rows={rows} className={cn('f-input', className)} {...p} />;
