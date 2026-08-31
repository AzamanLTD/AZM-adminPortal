import { useId } from 'react';
import { cn } from '@/lib/utils';

/** @param {{ label?: string, hint?: string, error?: string, required?: boolean, children?: any, className?: string }} props */
export function Field({ label, hint, error, required = false, children, className = '' }) {
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

/** @param {import('react').InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }} props */
export const Input = ({ className = '', invalid = false, ...p }) =>
  <input className={cn('f-input', className)} aria-invalid={invalid || undefined} {...p} />;

/** @param {import('react').TextareaHTMLAttributes<HTMLTextAreaElement>} props */
export const Textarea = ({ className = '', rows = 4, ...p }) =>
  <textarea rows={rows} className={cn('f-input', className)} {...p} />;
