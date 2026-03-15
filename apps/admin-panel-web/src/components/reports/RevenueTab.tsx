import { Skeleton } from '@/components/ui/skeleton';
import { LineChartCard } from './LineChartCard';
import { StatCard } from './StatCard';
import { ExportButton } from './ExportButton';
import { useReportQuery } from './useReportQuery';
import endpoints from '@/api/endpoints';
import { DollarSign } from 'lucide-react';

interface DateRangeProps {
  startDate: string;
  endDate: string;
  groupBy: string;
}

interface RevenueStats {
  totalRevenue: number;
  last30Days: number;
}

interface RevenueRow {
  period: string;
  revenue: number;
  payments: number;
}

interface RevenueByEmployerRow {
  company_name: string;
  total_revenue: number;
  payment_count: number;
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function RevenueTab({ startDate, endDate, groupBy }: DateRangeProps) {
  const { data: revenueStats, isLoading: statsLoading } = useReportQuery<RevenueStats>(
    ['reports', 'revenueStats'],
    endpoints.reports.revenueStats,
  );

  const { data: revenueOverTime, isLoading: timeLoading } = useReportQuery<RevenueRow[]>(
    ['reports', 'revenueReport', startDate, endDate, groupBy],
    endpoints.reports.revenueReport,
    { startDate, endDate, groupBy },
  );

  const { data: revenueByEmployer } = useReportQuery<RevenueByEmployerRow[]>(
    ['reports', 'revenueByEmployer', startDate, endDate],
    endpoints.reports.revenueByEmployer,
    { startDate, endDate, limit: 10 },
  );

  if (statsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
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

  const timeData = (revenueOverTime || []).map((r) => ({
    period: r.period,
    revenue: Number(r.revenue),
    payments: Number(r.payments),
  }));

  const totalPayments = timeData.reduce((sum, r) => sum + r.payments, 0);
  const avgPayment = totalPayments > 0 ? (revenueStats?.totalRevenue || 0) / totalPayments : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton
          data={(revenueByEmployer || []).map((r) => ({
            company: r.company_name,
            revenue: r.total_revenue,
            payments: r.payment_count,
          }))}
          filename="revenue-by-employer"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Revenue"
          value={fmtCurrency(revenueStats?.totalRevenue || 0)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard title="Last 30 Days" value={fmtCurrency(revenueStats?.last30Days || 0)} />
        <StatCard title="Avg per Payment" value={fmtCurrency(avgPayment)} />
      </div>

      {timeLoading ? (
        <div className="bg-admin-surface rounded-lg border border-admin-border-subtle p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <LineChartCard
          title="Revenue Over Time"
          subtitle={`${groupBy}ly breakdown`}
          data={timeData}
          xKey="period"
          lines={[{ dataKey: 'revenue', color: '#22c55e', name: 'Revenue ($)' }]}
        />
      )}

      {revenueByEmployer && revenueByEmployer.length > 0 && (
        <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue by Employer</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border-subtle">
                <th className="text-left py-2 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Company</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Revenue</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Payments</th>
              </tr>
            </thead>
            <tbody>
              {revenueByEmployer.map((r, i) => (
                <tr key={i} className="border-b border-admin-border-subtle last:border-0">
                  <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 font-medium text-foreground">{r.company_name || 'N/A'}</td>
                  <td className="py-2.5 text-right text-foreground">
                    {fmtCurrency(Number(r.total_revenue))}
                  </td>
                  <td className="py-2.5 text-right text-foreground">{Number(r.payment_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
