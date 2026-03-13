import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Mon", registrations: 12 },
  { name: "Tue", registrations: 19 },
  { name: "Wed", registrations: 8 },
  { name: "Thu", registrations: 15 },
  { name: "Fri", registrations: 22 },
  { name: "Sat", registrations: 18 },
  { name: "Sun", registrations: 14 },
];

export function SimpleChart() {
  return (
    <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">New Registrations</h3>
        <p className="text-sm text-muted-foreground">Weekly overview</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              className="text-xs text-muted-foreground"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              className="text-xs text-muted-foreground"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "var(--shadow-card)"
              }}
            />
            <Bar 
              dataKey="registrations" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}