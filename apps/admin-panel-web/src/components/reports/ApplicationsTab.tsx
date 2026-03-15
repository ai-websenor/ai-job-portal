import { Skeleton } from '@/components/ui/skeleton';
import { LineChartCard } from './LineChartCard';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { StatCard } from './StatCard';
import { ExportButton } from './ExportButton';
import { useReportQuery } from './useReportQuery';
import endpoints from '@/api/endpoints';

interface DateRangeProps {
  startDate: string;
  endDate: string;
  groupBy: string;
}

interface AppTimeRow {
  period: string;
  status: string;
  count: number;
}

interface AppStats {
  total: number;
  byStatus: Record<string, number>;
  newLast30Days: number;
}

export function ApplicationsTab({ startDate, endDate, groupBy }: DateRangeProps) {
  const { data: appStats, isLoading: statsLoading } = useReportQuery<AppStats>(
    ['reports', 'appStats'],
    endpoints.reports.applicationStats,
  );

  const { data: appsOverTime, isLoading: timeLoading } = useReportQuery<AppTimeRow[]>(
    ['reports', 'appsOverTime', startDate, endDate, groupBy],
    endpoints.reports.applicationsOverTime,
    { startDate, endDate, groupBy },
  );

  if (statsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-admin-surface rounded-lg border border-admin-border-subtle p-5"
          >
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Aggregate time series by period (sum all statuses)
  const periodMap: Record<string, number> = {};
  for (const row of appsOverTime || []) {
    periodMap[row.period] = (periodMap[row.period] || 0) + Number(row.count);
  }
  const timeData = Object.entries(periodMap).map(([period, count]) => ({ period, count }));

  const statusData = Object.entries(appStats?.byStatus || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value: Number(value),
  }));

  const topStatuses = Object.entries(appStats?.byStatus || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton data={timeData} filename="applications-over-time" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Applications" value={(appStats?.total || 0).toLocaleString()} />
        <StatCard title="New (30d)" value={(appStats?.newLast30Days || 0).toLocaleString()} />
        {topStatuses.slice(0, 2).map(([status, count]) => (
          <StatCard
            key={status}
            title={status.replace(/_/g, ' ')}
            value={Number(count).toLocaleString()}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {timeLoading ? (
          <div className="bg-admin-surface rounded-lg border border-admin-border-subtle p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <LineChartCard
            title="Applications Over Time"
            subtitle={`${groupBy}ly breakdown`}
            data={timeData}
            xKey="period"
            lines={[{ dataKey: 'count', color: 'hsl(var(--primary))', name: 'Applications' }]}
          />
        )}

        <DonutChart title="Application Status" subtitle="Breakdown by status" data={statusData} />
      </div>
    </div>
  );
}
