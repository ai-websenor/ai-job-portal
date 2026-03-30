import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SimpleChartProps {
  title: string;
  subtitle: string;
  data: { name: string; value: number }[];
  dataKey?: string;
  barColor?: string;
}

export function SimpleChart({
  title,
  subtitle,
  data,
  dataKey = 'value',
  barColor = 'hsl(var(--primary))',
}: SimpleChartProps) {
  return (
    <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                className="text-xs text-muted-foreground"
              />
              <YAxis axisLine={false} tickLine={false} className="text-xs text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-card)',
                }}
              />
              <Bar dataKey={dataKey} fill={barColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
