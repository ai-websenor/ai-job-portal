'use client';

import NoDataFound from '@/app/components/lib/NoDataFound';
import BackButton from '@/app/components/lib/BackButton';
import JobDetails from './JobDetails';
import { use, useEffect, useState } from 'react';
import { IJob } from '@/app/types/types';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import Chatbot from '@/app/components/chats/Chatbot';

function page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<IJob | null>(null);

  const getJob = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.JOBS.DETAILS(id));
      if (response?.data) {
        setJob(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJob();
  }, []);

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
      <title>{job?.title}</title>
      <div className="container mx-auto px-4 my-6 md:my-10 relative">
        <BackButton showLabel />
        <div className="my-6">
          <JobDetails job={job} refetch={getJob} />
        </div>
        <Chatbot jobId={id} />
      </div>
    </>
  );
}

export default page;
