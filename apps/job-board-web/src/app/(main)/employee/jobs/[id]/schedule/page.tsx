'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import ScheduleInterviewForm from './ScheduleInterviewForm';
import { use, useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { FaBriefcase, FaUserTie } from 'react-icons/fa';

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
      <title>Schedule Interview</title>
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-2 mb-6">
            <BackButton showLabel className="text-primary hover:text-primary-600" />
            <h1 className="text-2xl font-bold text-foreground">Schedule Interview</h1>
            {application && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1">
                  <FaUserTie className="text-blue-600" size={12} />
                  <span className="truncate text-xs font-medium text-gray-700">
                    {application?.profile?.firstName} {application?.profile?.lastName}
                  </span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
                  <FaBriefcase className="text-emerald-600" size={12} />
                  <span className="truncate text-xs font-medium text-gray-700">
                    {application?.application?.jobTitle}
                  </span>
                </div>
              </div>
            )}
          </div>
          <ScheduleInterviewForm />
        </div>
      )}
    </>
  );
};

export default withAuth(page);
