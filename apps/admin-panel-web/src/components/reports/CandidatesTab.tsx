import { Skeleton } from '@/components/ui/skeleton';
import { SimpleChart } from '@/components/dashboard/SimpleChart';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { StatCard } from './StatCard';
import { ExportButton } from './ExportButton';
import { useReportQuery } from './useReportQuery';
import endpoints from '@/api/endpoints';

interface CandidateAnalytics {
  byExperience: { bracket: string; count: number }[];
  byLocation: { location: string; count: number }[];
  byGender: { gender: string; count: number }[];
  profileCompletion: { total: number; complete: number; avg_completion: number };
}

export function CandidatesTab() {
  const { data, isLoading } = useReportQuery<CandidateAnalytics>(
    ['reports', 'candidateAnalytics'],
    endpoints.reports.candidateAnalytics,
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
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
      </div>
    );
  }

  if (!data) return null;

  const experienceData = data.byExperience.map((r) => ({
    name: r.bracket,
    value: Number(r.count),
  }));

  const locationData = data.byLocation.slice(0, 10).map((r) => ({
    name: r.location?.length > 15 ? r.location.slice(0, 15) + '...' : r.location || 'N/A',
    value: Number(r.count),
  }));

  const genderData = data.byGender.map((r) => ({
    name: r.gender === 'not_specified' ? 'Not Specified' : r.gender,
    value: Number(r.count),
  }));

  const completion = data.profileCompletion;
  const completeRate =
    completion.total > 0
      ? ((Number(completion.complete) / Number(completion.total)) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton
          data={data.byExperience.map((r) => ({ experience: r.bracket, count: r.count }))}
          filename="candidate-experience"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Candidates" value={Number(completion.total).toLocaleString()} />
        <StatCard
          title="Profile Complete"
          value={`${completeRate}%`}
          subtitle={`${Number(completion.complete)} profiles`}
        />
        <StatCard title="Avg Completion" value={`${Number(completion.avg_completion || 0)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          title="By Experience Level"
          subtitle="Candidate distribution"
          data={experienceData}
        />
        <SimpleChart
          title="By Location"
          subtitle="Top 10 states"
          data={locationData}
          barColor="hsl(var(--chart-2, 142 71% 45%))"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart title="Gender Distribution" subtitle="Candidate breakdown" data={genderData} />
      </div>
    </div>
  );
}
