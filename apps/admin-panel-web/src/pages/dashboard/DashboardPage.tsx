import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Briefcase,
  FileText,
  DollarSign,
  TrendingUp,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { AnalyticsCard } from '@/components/dashboard/AnalyticsCard';
import { SimpleChart } from '@/components/dashboard/SimpleChart';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { TopEmployersTable } from '@/components/dashboard/TopEmployersTable';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { Skeleton } from '@/components/ui/skeleton';

// The backend ResponseInterceptor wraps all responses as:
// { data: T, message: string, status: string, statusCode: number }
// The Axios response interceptor returns response.data (the full body),
// so we receive this wrapped shape.
interface ApiResponse<T> {
  data: T;
  message: string;
  status: string;
  statusCode: number;
}

interface DashboardStats {
  users: {
    total: number;
    byRole: Record<string, number>;
    newLast30Days: number;
  };
  jobs: {
    total: number;
    byStatus: { active: number; inactive: number };
    newLast30Days: number;
  };
  applications: {
    total: number;
    byStatus: Record<string, number>;
    newLast30Days: number;
  };
  revenue: {
    totalRevenue: number;
    last30Days: number;
  };
}

interface UserGrowthRow {
  period: string;
  role: string;
  count: number;
}

interface CategoryRow {
  category: string;
  job_count: number;
  application_count: number;
}

interface TopEmployerRow {
  company_name: string;
  employer_id: string;
  job_count: number;
  application_count: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function CardSkeleton() {
  return (
    <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
      <Skeleton className="h-5 w-40 mb-1" />
      <Skeleton className="h-3 w-28 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function Dashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res: ApiResponse<DashboardStats> = await http.get(endpoints.dashboard.stats);
      return res.data;
    },
    refetchInterval: 60_000,
  });

  const { data: userGrowth, isLoading: growthLoading } = useQuery<UserGrowthRow[]>({
    queryKey: ['dashboard', 'userGrowth'],
    queryFn: async () => {
      const res: ApiResponse<UserGrowthRow[]> = await http.get(endpoints.dashboard.userGrowth, {
        params: { groupBy: 'day' },
      });
      return res.data;
    },
  });

  const { data: jobCategories, isLoading: categoriesLoading } = useQuery<CategoryRow[]>({
    queryKey: ['dashboard', 'jobCategories'],
    queryFn: async () => {
      const res: ApiResponse<CategoryRow[]> = await http.get(endpoints.dashboard.jobCategories);
      return res.data;
    },
  });

  const { data: topEmployers, isLoading: employersLoading } = useQuery<TopEmployerRow[]>({
    queryKey: ['dashboard', 'topEmployers'],
    queryFn: async () => {
      const res: ApiResponse<TopEmployerRow[]> = await http.get(endpoints.dashboard.topEmployers, {
        params: { limit: 10 },
      });
      return res.data;
    },
  });

  const userGrowthChartData = (userGrowth || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.period] = (acc[row.period] || 0) + Number(row.count);
    return acc;
  }, {});

  const growthChartData = Object.entries(userGrowthChartData).map(([period, value]) => ({
    name: period.slice(5), // "MM-DD" from "YYYY-MM-DD"
    value,
  }));

  const applicationStatusData = Object.entries(stats?.applications?.byStatus || {}).map(
    ([name, value]) => ({ name, value: Number(value) }),
  );

  const categoryChartData = (jobCategories || []).slice(0, 10).map((cat) => ({
    name: cat.category?.length > 15 ? cat.category.slice(0, 15) + '...' : cat.category,
    value: Number(cat.job_count),
  }));

  const totalCandidates = Number(stats?.users?.byRole?.['candidate'] || 0);
  const totalEmployers = Number(stats?.users?.byRole?.['employer'] || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and analytics</p>
        </div>
        <button
          onClick={() => refetchStats()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-admin-border-subtle rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard
            title="Total Users"
            value={formatNumber(stats?.users?.total || 0)}
            description={`${formatNumber(stats?.users?.newLast30Days || 0)} new in last 30 days`}
            icon={<Users className="h-4 w-4" />}
          />
          <AnalyticsCard
            title="Total Jobs"
            value={formatNumber(stats?.jobs?.total || 0)}
            description={`${stats?.jobs?.byStatus?.active || 0} active, ${stats?.jobs?.byStatus?.inactive || 0} inactive`}
            icon={<Briefcase className="h-4 w-4" />}
          />
          <AnalyticsCard
            title="Applications"
            value={formatNumber(stats?.applications?.total || 0)}
            description={`${formatNumber(stats?.applications?.newLast30Days || 0)} new in last 30 days`}
            icon={<FileText className="h-4 w-4" />}
          />
          <AnalyticsCard
            title="Total Revenue"
            value={formatCurrency(stats?.revenue?.totalRevenue || 0)}
            description={`${formatCurrency(stats?.revenue?.last30Days || 0)} in last 30 days`}
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Secondary Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard
            title="Candidates"
            value={formatNumber(totalCandidates)}
            description="Registered job seekers"
            icon={<Users className="h-4 w-4" />}
          />
          <AnalyticsCard
            title="Employers"
            value={formatNumber(totalEmployers)}
            description="Registered employers"
            icon={<Building2 className="h-4 w-4" />}
          />
          <AnalyticsCard
            title="Active Jobs"
            value={formatNumber(stats?.jobs?.byStatus?.active || 0)}
            description="Currently live listings"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <AnalyticsCard
            title="New Jobs (30d)"
            value={formatNumber(stats?.jobs?.newLast30Days || 0)}
            description="Posted in last 30 days"
            icon={<Briefcase className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Charts Row 1: User Growth + Application Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {growthLoading ? (
          <ChartSkeleton />
        ) : (
          <SimpleChart title="User Registrations" subtitle="Last 30 days" data={growthChartData} />
        )}

        {statsLoading ? (
          <ChartSkeleton />
        ) : (
          <DonutChart
            title="Application Status"
            subtitle="Breakdown by status"
            data={applicationStatusData}
          />
        )}
      </div>

      {/* Charts Row 2: Job Categories + Top Employers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoriesLoading ? (
          <ChartSkeleton />
        ) : (
          <SimpleChart
            title="Jobs by Category"
            subtitle="Top 10 categories"
            data={categoryChartData}
            barColor="hsl(var(--chart-2, 142 71% 45%))"
          />
        )}

        {employersLoading ? <ChartSkeleton /> : <TopEmployersTable data={topEmployers || []} />}
      </div>

      {/* Quick Stats */}
      {!statsLoading && stats && (
        <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Stats</h3>
            <p className="text-sm text-muted-foreground">Key metrics at a glance</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between py-2 border-b border-admin-border-subtle lg:border-0">
              <span className="text-sm text-muted-foreground">Jobs per Employer</span>
              <span className="font-medium text-foreground">
                {totalEmployers > 0 ? (stats.jobs.total / totalEmployers).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-admin-border-subtle lg:border-0">
              <span className="text-sm text-muted-foreground">Applications per Job</span>
              <span className="font-medium text-foreground">
                {stats.jobs.total > 0
                  ? (stats.applications.total / stats.jobs.total).toFixed(1)
                  : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-admin-border-subtle lg:border-0">
              <span className="text-sm text-muted-foreground">Avg Revenue per Payment</span>
              <span className="font-medium text-foreground">
                {stats.revenue.totalRevenue > 0 && stats.applications.total > 0
                  ? formatCurrency(stats.revenue.totalRevenue / stats.applications.total)
                  : '$0'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">User Roles</span>
              <span className="font-medium text-foreground">
                {Object.keys(stats.users.byRole).length} types
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
