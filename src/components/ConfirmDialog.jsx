import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reusable confirmation dialog replacing window.confirm().
 * Simple yes/no modal — no text input needed.
 *
 * Props:
 *   open: boolean
 *   title: string
 *   message: string
 *   confirmLabel: string
 *   variant: 'default' | 'destructive'
 *   onConfirm: () => void
 *   onCancel: () => void
 *   isPending: boolean
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
  onConfirm,
  onCancel,
  isPending = false,
}) {
  if (!open) return null;

  const confirmColorClass =
    variant === 'destructive'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : 'bg-az-border-bright hover:bg-az-border text-az-text-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-az-surface border border-az-border rounded-xl w-full max-w-md mx-4 p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          {variant === 'destructive' && (
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-az-text-primary">{title}</h2>
            {message && <p className="text-sm text-az-text-secondary">{message}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 border border-az-border text-az-text-secondary hover:text-white hover:bg-az-card"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className={`flex-1 ${confirmColorClass} text-sm font-medium`}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? 'Processing…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
