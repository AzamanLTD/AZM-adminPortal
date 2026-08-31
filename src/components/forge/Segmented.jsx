import { motion, LayoutGroup } from 'framer-motion';
import { spring } from '@/lib/motion';
import { useId } from 'react';

/** @param {{ options: Array<{ value: string, label: string }>, value: string, onChange: (value: string) => void, ariaLabel?: string }} props */
export function Segmented({ options, value, onChange, ariaLabel = 'Options' }) {
  const gid = useId();
  return (
    <LayoutGroup id={gid}>
      <div className="f-seg" role="tablist" aria-label={ariaLabel}>
        {options.map(o => (
          <button key={o.value} role="tab"
            aria-selected={value === o.value}
            onClick={() => onChange(o.value)}>
            {value === o.value && (
              <motion.span layoutId="seg-pill" className="f-seg__pill"
                           transition={spring.indicator} />
            )}
            {o.label}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
