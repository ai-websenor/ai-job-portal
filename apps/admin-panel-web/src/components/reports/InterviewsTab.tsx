import { Skeleton } from '@/components/ui/skeleton';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { SimpleChart } from '@/components/dashboard/SimpleChart';
import { StatCard } from './StatCard';
import { ExportButton } from './ExportButton';
import { useReportQuery } from './useReportQuery';
import endpoints from '@/api/endpoints';

interface DateRangeProps {
  startDate: string;
  endDate: string;
}

interface InterviewStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byMode: Record<string, number>;
}

export function InterviewsTab({ startDate, endDate }: DateRangeProps) {
  const { data, isLoading } = useReportQuery<InterviewStats>(
    ['reports', 'interviewStats', startDate, endDate],
    endpoints.reports.interviewStats,
    { startDate, endDate },
  );

  if (isLoading) {
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

  if (!data) return null;

  const statusData = Object.entries(data.byStatus).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const typeData = Object.entries(data.byType).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const modeData = Object.entries(data.byMode).map(([name, value]) => ({
    name,
    value,
  }));

  const exportRows = statusData.map((s) => ({ status: s.name, count: s.value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton data={exportRows} filename="interview-stats" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Interviews" value={data.total.toLocaleString()} />
        <StatCard title="Scheduled" value={(data.byStatus['scheduled'] || 0).toLocaleString()} />
        <StatCard title="Completed" value={(data.byStatus['completed'] || 0).toLocaleString()} />
        <StatCard title="Canceled" value={(data.byStatus['canceled'] || 0).toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart title="By Status" subtitle="Interview status breakdown" data={statusData} />
        <SimpleChart title="By Type" subtitle="Interview type distribution" data={typeData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart title="By Mode" subtitle="Online vs Offline" data={modeData} />
      </div>
    </div>
  );
}
