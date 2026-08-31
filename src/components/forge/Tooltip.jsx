import * as T from '@radix-ui/react-tooltip';

export const TooltipProvider = ({ children }) =>
  <T.Provider delayDuration={400} skipDelayDuration={200}>{children}</T.Provider>;

/** @param {{ label?: string, side?: 'top'|'right'|'bottom'|'left', children: any }} props */
export function Tooltip({ label, side = 'top', children }) {
  if (!label) return children;
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="f-tip">{label}</T.Content>
      </T.Portal>
    </T.Root>
  );
}
