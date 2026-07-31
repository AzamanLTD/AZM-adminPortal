// src/components/ui/AzButton.jsx
// Fully accessible, animated button with loading state.

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  primary:   'az-btn-primary',
  secondary: 'az-btn-secondary',
  ghost:     'az-btn-ghost',
  danger:    'az-btn-danger',
  accent:    'az-btn-primary',
};

const SIZES = {
  xs: 'px-2.5 py-1 text-xs rounded-md gap-1',
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  xl: 'px-6 py-3 text-base rounded-xl gap-2.5',
  icon: 'p-2 rounded-lg',
};

const AzButton = forwardRef(function AzButton(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    icon: Icon,
    iconPosition = 'left',
    children,
    className,
    ...props
  },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.08 }}
      className={cn('az-btn', VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />
      )}
      {children && <span>{children}</span>}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
    </motion.button>
  );
});

export default AzButton;
