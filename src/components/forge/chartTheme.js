export const AXIS = {
  stroke:'var(--f-line)',
  tick:{ fill:'var(--f-text-3)', fontSize:11, fontFamily:'JetBrains Mono' },
  tickLine:false, axisLine:false,
};
export const GRID = { stroke:'var(--f-line)', strokeDasharray:'0', vertical:false };
export const SERIES = {
  primary:  'var(--f-tint-color)',
  secondary:'var(--f-ink-400)',
  muted:    'var(--f-line-strong)',
};

export function ChartTooltip({ active, payload, label, format = v => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="f-card f-card--raised px-3 py-2">
      <div className="f-eyebrow mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-3 text-sm">
          <span className="h-2 w-2 rounded-sm" style={{ background:p.color }} aria-hidden />
          <span className="text-ink-3">{p.name}</span>
          <span className="f-num ml-auto text-ink">{format(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
