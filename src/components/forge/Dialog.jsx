// src/components/forge/Dialog.jsx
// Forge Dialog — built on Radix Dialog with forge tokens
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function Dialog({ open, onOpenChange, children }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixDialog.Root>
  );
}

export function DialogTrigger({ children, ...props }) {
  return <RadixDialog.Trigger {...props}>{children}</RadixDialog.Trigger>;
}

export function DialogContent({ children, className = '', showClose = true }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="f-scrim" />
      <RadixDialog.Content
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border border-line bg-surface-raised p-6 shadow-lg focus:outline-none ${className}`}
      >
        {children}
        {showClose && (
          <RadixDialog.Close className="absolute top-4 right-4 rounded-sm opacity-60 hover:opacity-100 transition-opacity focus:outline-none">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ children, className = '' }) {
  return <div className={`flex flex-col gap-1.5 mb-4 ${className}`}>{children}</div>;
}

export function DialogTitle({ children, className = '' }) {
  return (
    <RadixDialog.Title className={`text-base font-semibold text-text ${className}`}>
      {children}
    </RadixDialog.Title>
  );
}

export function DialogDescription({ children, className = '' }) {
  return (
    <RadixDialog.Description className={`text-sm text-ink-3 ${className}`}>
      {children}
    </RadixDialog.Description>
  );
}

export function DialogFooter({ children, className = '' }) {
  return (
    <div className={`flex justify-end gap-3 mt-6 ${className}`}>
      {children}
    </div>
  );
}
