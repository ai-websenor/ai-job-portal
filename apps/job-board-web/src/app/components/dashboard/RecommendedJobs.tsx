'use client';

import { useEffect, useState } from 'react';
import { IJob } from '@/app/types/types';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { Button } from '@heroui/react';
import JobCard from '../cards/JobCard';
import Link from 'next/link';
import routePaths from '@/app/config/routePaths';
import LoadingProgress from '../lib/LoadingProgress';

const RecommendedJobs = () => {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);
  // 'recent' means nothing matched the candidate's skills — the list is just
  // recent openings and must not be presented as personalised matches.
  const [isRecentOnly, setIsRecentOnly] = useState(false);

  const getJobs = async () => {
    try {
      setLoading(true);
      const res: any = await http.get(ENDPOINTS.JOBS.RECOMMENDED, {
        params: {
          page: 1,
          limit: 5,
        },
      });
      if (res?.data) {
        setJobs(res?.data);
        setIsRecentOnly(res?.source === 'recent');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs();
  }, []);

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          {isRecentOnly && jobs?.length > 0 ? 'Recent Openings' : 'Recommended Jobs for You'}
        </h2>
        {jobs?.length > 0 && (
          <Link
            href={routePaths.jobs.search}
            className="text-primary text-sm font-semibold hover:underline"
          >
            View All
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingProgress />
          </div>
        ) : jobs?.length > 0 ? (
          <>
            {isRecentOnly && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-sm text-gray-700">
                  No jobs match your skills yet — here are recent openings.
                </p>
                <Link
                  href={routePaths.profile}
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  Add more skills to your profile
                </Link>
              </div>
            )}
            {jobs?.map((job) => (
              <JobCard key={job.id} job={job} refetch={getJobs} />
            ))}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500">No jobs available right now</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon, or browse all openings.</p>
            <Button
              as={Link}
              href={routePaths.jobs.search}
              color="primary"
              variant="flat"
              className="mt-4"
            >
              Browse Jobs
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default RecommendedJobs;
