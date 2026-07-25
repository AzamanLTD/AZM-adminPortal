/**
 * Mini sparkline for KPI cards — renders a tiny inline area chart
 * from an array of numbers. No axes, no legend — just the trend shape.
 */
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

export default function Sparkline({ data = [], color = '#10b981', height = 36 }) {
  if (!data.length) {
    return <div style={{ height }} className="flex items-center justify-center text-az-text-muted text-xs">—</div>;
  }

  const chartData = data.map((v, i) => ({ i, v: Number(v) || 0 }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
