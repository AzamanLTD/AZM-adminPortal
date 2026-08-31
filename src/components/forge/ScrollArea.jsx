// src/components/forge/ScrollArea.jsx
// Forge ScrollArea — thin wrapper around Radix ScrollArea
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

export function ScrollArea({ children, className = '', ...props }) {
  return (
    <ScrollAreaPrimitive.Root className={`relative overflow-hidden ${className}`} {...props}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

/** @param {{ orientation?: 'horizontal'|'vertical', className?: string }} props */
export function ScrollBar({ orientation = 'vertical', className = '' }) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation={orientation}
      className={`flex touch-none select-none transition-colors ${orientation === 'vertical' ? 'h-full w-2.5 border-l border-l-transparent p-px' : 'h-2.5 flex-col border-t border-t-transparent p-px'} ${className}`}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-line-strong hover:bg-ink-4" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}
