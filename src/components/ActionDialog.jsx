import { useState, useEffect } from 'react';
import { Button } from '@/components/forge';
import { Input } from '@/components/forge';
import { Textarea } from '@/components/forge';
import { AlertTriangle } from 'lucide-react';

/**
 * Reusable modal dialog for admin actions that previously used window.prompt().
 * Supports text input, select, or free-form textarea.
 *
 * Props:
 *   open: boolean
 *   title: string
 *   label: string (input label)
 *   placeholder: string
 *   confirmLabel: string
 *   variant: 'default' | 'destructive'
 *   onConfirm: (value: string) => void
 *   onCancel: () => void
 *   isPending: boolean
 *   inputType: 'text' | 'textarea' | 'select'
 *   options: [{ value, label }] (only for inputType='select')
 */
/** @param {{
 * open: boolean,
 * title?: string,
 * label?: string,
 * placeholder?: string,
 * confirmLabel?: string,
 * variant?: 'default' | 'destructive',
 * onConfirm: (value: string) => void,
 * onCancel: () => void,
 * isPending?: boolean,
 * inputType?: 'text' | 'textarea' | 'select',
 * options?: Array<{ value: string, label: string }>,
 * defaultValue?: string
 * }} props */
export default function ActionDialog({
  open,
  title,
  label,
  placeholder,
  confirmLabel = 'Confirm',
  variant = 'default',
  onConfirm,
  onCancel,
  isPending = false,
  inputType = 'text',
  options = [],
  defaultValue = '',
}) {
  const [value, setValue] = useState(defaultValue);

  // Sync defaultValue when dialog opens
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  if (!open) return null;

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
    }
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  const confirmColorClass =
    variant === 'destructive'
      ? 'bg-red-600 hover:bg-red-500 text-[var(--f-text)]'
      : 'bg-line-bright hover:bg-line text-ink-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 f-scrim" onClick={handleCancel} />
      <div className="relative bg-surface border border-line rounded-xl w-full max-w-md mx-4 p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          {variant === 'destructive' && (
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-bad" />
            </div>
          )}
          <h2 className="text-base font-semibold text-ink-primary pt-1">{title}</h2>
        </div>

        <div className="space-y-2">
          {label && <label className="text-xs text-ink-2 block">{label}</label>}
          {inputType === 'textarea' ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="bg-bg border-line text-[var(--f-text)] min-h-[80px]"
              autoFocus
            />
          ) : inputType === 'select' ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm text-[var(--f-text)]"
              autoFocus
            >
              <option value="">Select…</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="bg-bg border-line text-[var(--f-text)]"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) handleConfirm(); }}
            />
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 border border-line text-ink-2 hover:text-[var(--f-text)] hover:bg-surface"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className={`flex-1 ${confirmColorClass} text-sm font-medium`}
            disabled={!value.trim() || isPending}
            onClick={handleConfirm}
          >
            {isPending ? 'Processing…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
