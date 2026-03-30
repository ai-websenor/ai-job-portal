import { Users, Briefcase, FileText, DollarSign } from 'lucide-react';
import { StatCard } from './StatCard';
import { useReportQuery } from './useReportQuery';
import { Skeleton } from '@/components/ui/skeleton';
import endpoints from '@/api/endpoints';

interface DashboardStats {
  users: { total: number; byRole: Record<string, number>; newLast30Days: number };
  jobs: { total: number; byStatus: { active: number; inactive: number }; newLast30Days: number };
  applications: { total: number; byStatus: Record<string, number>; newLast30Days: number };
  revenue: { totalRevenue: number; last30Days: number };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtCurrency(n: number): string {
  return `$${fmt(n)}`;
}

export function OverviewTab() {
  const { data: stats, isLoading } = useReportQuery<DashboardStats>(
    ['reports', 'overview'],
    endpoints.reports.dashboard,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
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

  if (!stats) return null;

  const candidates = Number(stats.users.byRole?.['candidate'] || 0);
  const employers = Number(stats.users.byRole?.['employer'] || 0);
  const hired = Number(stats.applications.byStatus?.['hired'] || 0);
  const interviewScheduled = Number(stats.applications.byStatus?.['interview_scheduled'] || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Jobs"
          value={fmt(stats.jobs.total)}
          subtitle={`${stats.jobs.byStatus.active} active`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          title="Active Jobs"
          value={fmt(stats.jobs.byStatus.active)}
          subtitle={`${stats.jobs.byStatus.inactive} inactive`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard title="Candidates" value={fmt(candidates)} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Employers" value={fmt(employers)} icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={fmt(stats.applications.total)}
          subtitle={`${fmt(stats.applications.newLast30Days)} in last 30 days`}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Interviews Scheduled"
          value={fmt(interviewScheduled)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard title="Hires Completed" value={fmt(hired)} icon={<Users className="h-4 w-4" />} />
        <StatCard
          title="Total Revenue"
          value={fmtCurrency(stats.revenue.totalRevenue)}
          subtitle={`${fmtCurrency(stats.revenue.last30Days)} in last 30 days`}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
