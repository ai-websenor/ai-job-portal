import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface LineConfig {
  dataKey: string;
  color: string;
  name?: string;
}

interface LineChartCardProps {
  title: string;
  subtitle: string;
  data: Record<string, unknown>[];
  xKey: string;
  lines: LineConfig[];
}

export function LineChartCard({ title, subtitle, data, xKey, lines }: LineChartCardProps) {
  return (
    <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={xKey}
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
                }}
              />
              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.color}
                  name={line.name || line.dataKey}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
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
