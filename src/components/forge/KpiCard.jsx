import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Roll-up capped at 600ms regardless of magnitude. */
function useCounter(value, format) {
  const ref = useRef(null); const prev = useRef(0); const reduce = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reduce || typeof value !== 'number') { ref.current.textContent = format(value); return; }
    const controls = animate(prev.current, value, {
      duration: 0.6, ease: 'easeOut',
      onUpdate: v => { if (ref.current) ref.current.textContent = format(v); },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce, format]);
  return ref;
}

export function KpiCard({ label, value, format = v => Math.round(v).toLocaleString(),
                          delta, deltaLabel, polarity = 'normal', spark, onClick }) {
  const ref = useCounter(value, format);
  const dir = delta == null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  return (
    <div className={cn('f-card f-kpi', onClick && 'cursor-pointer')}
         data-polarity={polarity === 'invert' ? 'invert' : undefined}
         onClick={onClick}>
      <div className="f-kpi__k">{label}</div>
      <div className="f-kpi__v" ref={ref}>
        {typeof value === 'number' ? format(value) : value}
      </div>
      {delta != null && (
        <div className={`f-kpi__d f-kpi__d--${dir}`}>
          <Icon className="h-3 w-3" aria-hidden />
          {deltaLabel ?? `${Math.abs(delta)}%`}
        </div>
      )}
      {spark && <Sparkline data={spark} className="mt-3" />}
    </div>
  );
}

export function Sparkline({ data, height = 28, className }) {
  const reduce = useReducedMotion();
  if (!data?.length) return null;
  const max = Math.max(...data), min = Math.min(...data), span = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * 100},${height - ((v - min) / span) * height}`).join(' ');
  return (
    <svg className={className} viewBox={`0 0 100 ${height}`} height={height}
         preserveAspectRatio="none" aria-hidden>
      <motion.polyline points={pts} fill="none" stroke="var(--f-tint-color)"
        strokeWidth="1.5" vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round"
        initial={reduce ? false : { pathLength:0 }}
        animate={{ pathLength:1 }}
        transition={{ duration:0.6, ease:'easeOut' }} />
    </svg>
  );
}
