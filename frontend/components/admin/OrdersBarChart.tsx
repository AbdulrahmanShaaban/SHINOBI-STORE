'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  pending: '#6B6B80',
  confirmed: '#3B82F6',
  processing: '#FFB800',
  shipped: '#A78BFA',
  delivered: '#22C55E',
  cancelled: '#EF4444',
  refunded: '#F97316',
};

const DEFAULT_COLOR = '#FF6B00';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#2A2A3A] bg-[#16161F] px-3 py-2 shadow-lg">
      <p className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#B8B8CC]">{label}</p>
      <p className="font-bebas text-xl text-[#FFB800]">{payload[0].value}</p>
    </div>
  );
}

export default function OrdersBarChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count,
    key: status,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="status"
            tick={{ fill: '#6B6B80', fontSize: 11, fontFamily: 'Cinzel' }}
            axisLine={{ stroke: '#2A2A3A' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B6B80', fontSize: 11, fontFamily: 'Bebas Neue' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,107,0,0.06)' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? DEFAULT_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
