import { Skeleton } from '@/components/ui/skeleton';
import { FunnelChart } from './FunnelChart';
import { StatCard } from './StatCard';
import { ExportButton } from './ExportButton';
import { useReportQuery } from './useReportQuery';
import endpoints from '@/api/endpoints';

interface DateRangeProps {
  startDate: string;
  endDate: string;
}

interface HiringFunnelData {
  applied: number;
  viewed: number;
  shortlisted: number;
  interviewScheduled: number;
  offerAccepted: number;
  hired: number;
  rejected: number;
  offerRejected: number;
  withdrawn: number;
}

export function HiringFunnelTab({ startDate, endDate }: DateRangeProps) {
  const { data, isLoading } = useReportQuery<HiringFunnelData>(
    ['reports', 'hiringFunnel', startDate, endDate],
    endpoints.reports.hiringFunnel,
    { startDate, endDate },
  );

  if (isLoading) {
    return (
      <div className="bg-admin-surface rounded-lg border border-admin-border-subtle p-6">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const stages = [
    { name: 'Applied', value: data.applied, color: '#6366f1' },
    { name: 'Viewed', value: data.viewed, color: '#8b5cf6' },
    { name: 'Shortlisted', value: data.shortlisted, color: '#3b82f6' },
    { name: 'Interview', value: data.interviewScheduled, color: '#06b6d4' },
    { name: 'Offer Accepted', value: data.offerAccepted, color: '#10b981' },
    { name: 'Hired', value: data.hired, color: '#22c55e' },
  ];

  const pct = (num: number, denom: number) =>
    denom > 0 ? `${((num / denom) * 100).toFixed(1)}%` : '0%';

  const exportData = stages.map((s) => ({ stage: s.name, count: s.value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton data={exportData} filename="hiring-funnel" />
      </div>

      <FunnelChart title="Hiring Pipeline" subtitle="Application flow stages" stages={stages} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Shortlist Rate"
          value={pct(data.shortlisted, data.applied)}
          subtitle={`${data.shortlisted} of ${data.applied}`}
        />
        <StatCard
          title="Interview Rate"
          value={pct(data.interviewScheduled, data.shortlisted)}
          subtitle={`${data.interviewScheduled} of ${data.shortlisted}`}
        />
        <StatCard
          title="Offer Rate"
          value={pct(data.offerAccepted, data.interviewScheduled)}
          subtitle={`${data.offerAccepted} of ${data.interviewScheduled}`}
        />
        <StatCard
          title="Overall Hire Rate"
          value={pct(data.hired, data.applied)}
          subtitle={`${data.hired} of ${data.applied}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Rejected" value={data.rejected.toLocaleString()} />
        <StatCard title="Offer Rejected" value={data.offerRejected.toLocaleString()} />
        <StatCard title="Withdrawn" value={data.withdrawn.toLocaleString()} />
      </div>
    </div>
  );
}
