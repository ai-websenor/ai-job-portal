'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import ApplicantDetails from './ApplicantDetails';
import { use, useEffect, useState } from 'react';
import { IUser } from '@/app/types/types';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import NoDataFound from '@/app/components/lib/NoDataFound';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const page = ({ params }: { params: Promise<{ id: string; applicantId: string }> }) => {
  const { id, applicantId } = use(params);
  const [loading, setLoading] = useState(false);
  const [applicantProfile, setApplicantProfile] = useState<IUser | null>(null);

  const getDetails = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.PROFILE_DETAILS(applicantId!), {
        params: {
          applicationId: id,
        },
      });
      if (res.data) {
        console.log(res?.data);
        // setApplicantProfile(res.data.data)
      }
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
      <title>Rahul Verma | Applicant Profile</title>

      {loading ? (
        <LoadingProgress />
      ) : applicantProfile ? (
        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-2 mb-6">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold text-foreground">Rahul Verma</h1>
          </div>
          <ApplicantDetails profile={applicantProfile} />
        </div>
      ) : (
        <NoDataFound />
      )}
    </>
  );
};

export default withAuth(page);
