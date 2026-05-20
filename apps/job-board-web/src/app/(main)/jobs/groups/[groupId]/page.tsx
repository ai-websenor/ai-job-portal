'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { useParams, useRouter } from 'next/navigation';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import BackButton from '@/app/components/lib/BackButton';
import JobCard from '@/app/components/cards/JobCard';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { ICandidateJobGroup, IJob } from '@/app/types/types';

const CandidateJobGroupPage = () => {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [group, setGroup] = useState<Omit<ICandidateJobGroup, 'count'> | null>(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();

  const getJobs = useCallback(async () => {
    if (!params?.groupId) return;

    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.JOBS.RECOMMENDED_GROUP_JOBS(params.groupId), {
        params: { page, limit: 10 },
      });

      setGroup(response?.group || null);
      setJobs(response?.data || []);
      setTotalPages(response?.pagination?.pageCount || 0);
      setTotalJobs(response?.pagination?.totalJob || 0);
    } catch (error) {
      console.log('Failed to fetch candidate group jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, params?.groupId, setTotalPages]);

  useEffect(() => {
    getJobs();
  }, [getJobs]);

  return (
    <>
      <title>{group?.name || 'Matched Jobs'}</title>
      <div className="container mx-auto my-8 px-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <BackButton showLabel />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{group?.name || 'Matched Jobs'}</h1>
              <p className="mt-1 text-sm text-gray-500">Showing {totalJobs} profile-matched jobs</p>
            </div>
          </div>
          <Button color="primary" variant="flat" onPress={() => router.push(routePaths.dashboard)}>
            Dashboard
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingProgress />
          </div>
        ) : jobs.length > 0 ? (
          <>
            <div className="grid gap-5">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} refetch={getJobs} />
              ))}
            </div>
            {renderPagination()}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white py-16 text-center">
            <h3 className="text-lg font-bold text-gray-800">No matched jobs found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Update your skills, education, preferences, or experience to improve matches.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default withAuth(CandidateJobGroupPage);
