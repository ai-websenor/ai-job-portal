'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import ApplicantDetails from './ApplicantDetails';
import { use, useEffect, useState } from 'react';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import NoDataFound from '@/app/components/lib/NoDataFound';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { InterviewStatus } from '@/app/types/enum';

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
        if (res?.data?.application?.status === InterviewStatus.applied) {
          markProfileView(res?.data?.application?.applicationId!);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const markProfileView = async (applicationId: string) => {
    try {
      await http.put(ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE_STATUS(applicationId), {
        status: InterviewStatus.viewed,
      });
      getDetails();
    } catch (error) {
      console.log(error);
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
        <div className="container mx-auto p-6 space-y-6">
          <BackButton showLabel />
          <ApplicantDetails {...applicantProfile} />
        </div>
      ) : (
        <NoDataFound />
      )}
    </>
  );
};

export default withAuth(page);
