'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import { IJob } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Card, CardBody, Button } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import LoadingProgress from '../lib/LoadingProgress';

const SavedJobsWidget = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);

  const getJobs = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.JOBS.SAVED, {
        params: {
          page: 1,
          limit: 5,
        },
      });
      setJobs(res?.data ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('jobSaved', getJobs);

      return () => window.removeEventListener('jobSaved', getJobs);
    }
  }, []);

  return (
    <Card className="w-full bg-white shadow-sm border border-gray-100 p-4 mb-6">
      <CardBody className="p-0">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-lg">Saved Jobs</h3>
            {jobs?.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {jobs?.length}
              </span>
            )}
          </div>
          {jobs?.length > 0 && (
            <Link
              href={routePaths.savedJobs.list}
              className="text-primary text-sm font-semibold hover:underline"
            >
              View All
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <LoadingProgress />
            </div>
          ) : jobs?.length > 0 ? (
            jobs?.map((job, index) => (
              <div
                key={index}
                className="group border border-gray-100 rounded-xl p-3 bg-white hover:border-primary/30 hover:shadow-md transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-2">
                  <div
                    className="cursor-pointer"
                    onClick={() => router.push(routePaths.jobs?.detail(job?.id as string))}
                  >
                    <h4 className="font-semibold text-gray-800 text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {job?.title}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">{job?.company?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <FaMapMarkerAlt className="text-gray-400" />
                    <span>{job?.location}</span>
                  </div>
                  <div className="bg-gray-50 px-2 py-0.5 rounded text-gray-600 font-medium">
                    {job?.showSalary
                      ? CommonUtils.formatSalary(job?.salaryMin, job?.salaryMax)
                      : 'Salary Undisclosed'}
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    color="primary"
                    variant="solid"
                    disabled={job?.isApplied}
                    onPress={() => router.push(routePaths.jobs?.apply(job?.id as string))}
                    className="h-8 px-4 flex-1 text-xs font-medium disabled:cursor-not-allowed shadow-sm"
                  >
                    {job?.isApplied ? 'Applied' : 'Apply'}
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={() => router.push(routePaths.jobs?.detail(job?.id as string))}
                    className="h-8 px-4 flex-1 text-xs font-medium"
                  >
                    Details
                  </Button>
                </div>

                <div className="mt-2 text-[10px] text-gray-400 text-right">
                  {CommonUtils.determineDays(job?.createdAt ?? '')}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-500">No Saved Jobs</p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default SavedJobsWidget;
