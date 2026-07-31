// src/components/ui/AzEmptyState.jsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AzEmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
  size = 'md',
}) {
  const sizes = {
    sm: { icon: 'w-8 h-8', title: 'text-sm', desc: 'text-xs', py: 'py-8' },
    md: { icon: 'w-12 h-12', title: 'text-base', desc: 'text-sm', py: 'py-14' },
    lg: { icon: 'w-16 h-16', title: 'text-lg', desc: 'text-sm', py: 'py-20' },
  }[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
      className={cn('flex flex-col items-center justify-center gap-3 text-center', sizes.py, className)}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'var(--az-surface-3, var(--az-card))' }}>
          <Icon className={cn(sizes.icon)} style={{ color: 'var(--az-text-muted)' }} />
        </div>
      )}
      <div>
        <p className={cn('font-semibold', sizes.title)} style={{ color: 'var(--az-text-primary)' }}>{title}</p>
        {description && (
          <p className={cn('mt-1 max-w-sm', sizes.desc)} style={{ color: 'var(--az-text-muted)' }}>{description}</p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} className="az-btn az-btn-primary mt-2 gap-2">
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
