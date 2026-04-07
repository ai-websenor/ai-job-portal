'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import NoDataFound from '@/app/components/lib/NoDataFound';
import withAuth from '@/app/hoc/withAuth';
import { InterviewDetails as InterviewDetailsType } from '@/app/types/types';
import { use } from 'react';
import { useEffect, useState } from 'react';
import InterviewDetails from './InterviewDetails';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<InterviewDetailsType | null>(null);

  const getDetails = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.EMPLOYER.INTERVIEWS.DETAILS(id));
      setInterview(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDetails();
  }, []);

  return (
    <>
      <title>Interview</title>
      <div className="container mx-auto px-4 my-6 md:my-10 relative">
        <div className="flex flex-col gap-2 mb-5">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Interview Details</h1>
        </div>
        {loading ? (
          <LoadingProgress />
        ) : interview ? (
          <InterviewDetails interview={interview!} />
        ) : (
          <NoDataFound />
        )}
      </div>
    </>
  );
};

export default withAuth(page);
