import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANT = {
  primary:'f-btn--primary', secondary:'', ghost:'f-btn--ghost', danger:'f-btn--danger',
};
const SIZE = { sm:'f-btn--sm', md:'', lg:'f-btn--lg' };

/**
 * The only button in the product.
 * Deliberately NOT a motion.button: the press is pure CSS, so a table with
 * 400 row-actions costs zero listeners and zero React re-renders.
 */
export const Button = forwardRef(function Button(
  { variant='secondary', size='md', icon:Icon, iconRight:IconRight,
    loading=false, block=false, className, children, ...props }, ref) {

  const iconOnly = !children && (Icon || IconRight);
  return (
    <button
      ref={ref}
      className={cn('f-btn', VARIANT[variant], SIZE[size],
        iconOnly && 'f-btn--icon', block && 'f-btn--block', className)}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        : Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
    </button>
  );
});
