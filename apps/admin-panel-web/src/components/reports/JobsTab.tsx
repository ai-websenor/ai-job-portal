/* eslint-disable @typescript-eslint/no-explicit-any */
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleChart } from '@/components/dashboard/SimpleChart';
import { LineChartCard } from './LineChartCard';
import { StatCard } from './StatCard';
import { ExportButton } from './ExportButton';
import { useReportQuery } from './useReportQuery';
import endpoints from '@/api/endpoints';
import { Briefcase } from 'lucide-react';

interface DateRangeProps {
  startDate: string;
  endDate: string;
  groupBy: string;
}

interface JobTimeRow {
  period: string;
  count: number;
  active_count: number;
  inactive_count: number;
}

interface CategoryRow {
  category: string;
  job_count: number;
  application_count: number;
}

interface JobStats {
  total: number;
  byStatus: { active: number; inactive: number };
  newLast30Days: number;
}

export function JobsTab({ startDate, endDate, groupBy }: DateRangeProps) {
  const { data: jobStats, isLoading: statsLoading } = useReportQuery<JobStats>(
    ['reports', 'jobStats'],
    endpoints.reports.jobStats,
  );

  const { data: jobsOverTime, isLoading: timeLoading } = useReportQuery<JobTimeRow[]>(
    ['reports', 'jobsOverTime', startDate, endDate, groupBy],
    endpoints.reports.jobsOverTime,
    { startDate, endDate, groupBy },
  );

  const { data: categories, isLoading: catLoading } = useReportQuery<CategoryRow[]>(
    ['reports', 'jobCategories'],
    endpoints.reports.jobCategories,
  );

  const { data: topEmployers } = useReportQuery<Record<string, unknown>[]>(
    ['reports', 'topEmployers'],
    endpoints.reports.topEmployers,
    { limit: 10 },
  );

  if (statsLoading) {
    return (
      <div className="space-y-4">
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
      </div>
    );
  }

  const timeChartData = (jobsOverTime || []).map((r) => ({
    period: r.period,
    total: Number(r.count),
    active: Number(r.active_count),
    inactive: Number(r.inactive_count),
  }));

  const categoryData = (categories || []).slice(0, 10).map((c) => ({
    name: c.category?.length > 18 ? c.category.slice(0, 18) + '...' : c.category,
    value: Number(c.job_count),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton data={topEmployers || []} filename="top-employers" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Jobs"
          value={(jobStats?.total || 0).toLocaleString()}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard title="Active Jobs" value={(jobStats?.byStatus.active || 0).toLocaleString()} />
        <StatCard
          title="Inactive Jobs"
          value={(jobStats?.byStatus.inactive || 0).toLocaleString()}
        />
        <StatCard title="New (30d)" value={(jobStats?.newLast30Days || 0).toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {timeLoading ? (
          <div className="bg-admin-surface rounded-lg border border-admin-border-subtle p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <LineChartCard
            title="Jobs Posted Over Time"
            subtitle={`${groupBy}ly breakdown`}
            data={timeChartData}
            xKey="period"
            lines={[
              { dataKey: 'total', color: 'hsl(var(--primary))', name: 'Total' },
              { dataKey: 'active', color: '#22c55e', name: 'Active' },
            ]}
          />
        )}

        {catLoading ? (
          <div className="bg-admin-surface rounded-lg border border-admin-border-subtle p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <SimpleChart title="Jobs by Category" subtitle="Top 10 categories" data={categoryData} />
        )}
      </div>

      {topEmployers && topEmployers.length > 0 && (
        <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Employers by Jobs</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border-subtle">
                <th className="text-left py-2 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Company</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Jobs</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Applications</th>
              </tr>
            </thead>
            <tbody>
              {topEmployers.map((e: any, i: number) => (
                <tr key={i} className="border-b border-admin-border-subtle last:border-0">
                  <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 font-medium text-foreground">{e.company_name || 'N/A'}</td>
                  <td className="py-2.5 text-right text-foreground">{Number(e.job_count)}</td>
                  <td className="py-2.5 text-right text-foreground">
                    {Number(e.application_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
