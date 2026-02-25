'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import NoDataFound from '@/app/components/lib/NoDataFound';
import withAuth from '@/app/hoc/withAuth';
import { IJob } from '@/app/types/types';
import { use, useEffect, useState } from 'react';
import ApplyJobForm from './ApplyJobForm';
import JobDetails from '../../[id]/JobDetails';
import LoadingProgress from '@/app/components/lib/LoadingProgress';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<IJob | null>(null);

  const getJobDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.JOBS.DETAILS(id));
      if (response?.data) {
        setJob(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobDetails();
  }, [id]);

  if (loading) {
    return <LoadingProgress />;
  }

  if (!loading && !job) {
    return (
      <div className="container mx-auto px-4 my-6 space-y-2">
        <BackButton showLabel />
        <NoDataFound />
      </div>
    );
  }

  return (
    <>
      <title>{`Apply - ${job?.title}`}</title>
      <div className="container mx-auto px-4 my-6 md:my-10">
        <BackButton showLabel />
        <div className="flex xl:flex-row flex-col gap-10 w-full my-6">
          <ApplyJobForm job={job} />
          <JobDetails hideIcons job={job} />
        </div>
      </div>
    </>
  );
};

export default withAuth(page);
