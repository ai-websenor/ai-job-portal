'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import ApplicantDetails from './ApplicantDetails';
import { use, useEffect, useState } from 'react';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import NoDataFound from '@/app/components/lib/NoDataFound';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const page = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [applicantProfile, setApplicantProfile] = useState<any>(null);

  const getDetails = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.PROFILE_DETAILS(id!));
      if (res.data) {
        setApplicantProfile(res.data);
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
      <title>
        {applicantProfile?.profile?.firstName + ' ' + applicantProfile?.profile?.lastName} |
        Applicant Profile
      </title>

      {loading ? (
        <LoadingProgress />
      ) : applicantProfile ? (
        <div className="container mx-auto p-6">
          <div className="flex flex-col gap-2 mb-6">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold text-foreground">Rahul Verma</h1>
          </div>
          <ApplicantDetails {...applicantProfile} />
        </div>
      ) : (
        <NoDataFound />
      )}
    </>
  );
};

export default withAuth(page);
