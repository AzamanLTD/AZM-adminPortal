// src/components/forge/Sheet.jsx
// Forge Sheet — side drawer built on Radix Dialog
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

const sideClasses = {
  right: 'fixed top-0 right-0 h-full w-full max-w-sm z-50 border-l border-line bg-surface-raised shadow-lg',
  left: 'fixed top-0 left-0 h-full w-full max-w-sm z-50 border-r border-line bg-surface-raised shadow-lg',
  top: 'fixed top-0 left-0 right-0 z-50 border-b border-line bg-surface-raised shadow-lg',
  bottom: 'fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface-raised shadow-lg',
};

export function Sheet({ open, onOpenChange, children }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixDialog.Root>
  );
}

export function SheetTrigger({ children, ...props }) {
  return <RadixDialog.Trigger {...props}>{children}</RadixDialog.Trigger>;
}

export function SheetContent({ children, side = 'right', className = '' }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="f-scrim" />
      <RadixDialog.Content className={`${sideClasses[side]} ${className}`}>
        {children}
        <RadixDialog.Close className="absolute top-4 right-4 rounded-sm opacity-60 hover:opacity-100 transition-opacity focus:outline-none">
          <X className="w-4 h-4" />
          <span className="sr-only">Close</span>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function SheetHeader({ children, className = '' }) {
  return <div className={`flex flex-col gap-1.5 p-4 border-b border-line ${className}`}>{children}</div>;
}

export function SheetTitle({ children, className = '' }) {
  return (
    <RadixDialog.Title className={`text-base font-semibold text-text ${className}`}>
      {children}
    </RadixDialog.Title>
  );
}

export function SheetDescription({ children, className = '' }) {
  return (
    <RadixDialog.Description className={`text-sm text-ink-3 ${className}`}>
      {children}
    </RadixDialog.Description>
  );
}

export function SheetFooter({ children, className = '' }) {
  return <div className={`flex justify-end gap-3 p-4 border-t border-line ${className}`}>{children}</div>;
}
