'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import ScheduleInterviewForm from './ScheduleInterviewForm';
import { use, useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '@/app/components/lib/LoadingProgress';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<any>(null);

  const getApplicant = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.PROFILE_DETAILS(id));
      if (res.data) {
        setApplication(res?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getApplicant();
  }, []);

  return (
    <>
      <title>Schedule Interview - {application?.profile?.firstName}</title>
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-2 mb-6">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold text-foreground">Schedule Interview</h1>
            {application && (
              <p className="text-sm text-default-500 -mt-2">
                {application?.profile?.firstName} {application?.profile?.lastName} |{' '}
                {application?.application?.jobTitle}
              </p>
            )}
          </div>
          <ScheduleInterviewForm />
        </div>
      )}
    </>
  );
};

export default withAuth(page);
