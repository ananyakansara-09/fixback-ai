import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyIncidentActivity } from '@/types/dashboard';

export function IncidentActivityChart({ data }: { data: DailyIncidentActivity[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="submittedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="resolvedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#243049" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #243049', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
            cursor={{ stroke: '#334155' }}
          />
          <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#8b5cf6" strokeWidth={2} fill="url(#submittedFill)" />
          <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#3b82f6" strokeWidth={2} fill="url(#resolvedFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
